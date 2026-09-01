/**
 * O painel de fotos — a única ilha React do projeto. (ADR-006 exceção, ADR-008)
 *
 * Por que aqui se paga: envio com progresso, conversão da imagem no browser,
 * galeria com seleção e pré-visualização otimista são ESTADO, não conteúdo.
 * Fazer isto com `<details>` seria teimosia, e o custo em JS não toca nenhuma
 * página pública.
 *
 * A imagem é convertida para WebP AQUI, antes de subir. Três motivos, nessa
 * ordem de importância:
 *   1. o `canvas` re-codifica e descarta o EXIF junto — que é onde mora a
 *      coordenada de GPS da foto tirada no celular;
 *   2. o dono manda 400 KB pela rede em vez de 6 MB;
 *   3. o servidor passa a esperar um formato só, o que torna a validação
 *      estrita e curta.
 * Nada disso é confiança no cliente: o servidor relê o cabeçalho do arquivo e
 * decide sozinho. (src/lib/upload.ts)
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import './painel.css';

const LADO_MAXIMO = 2400;
const QUALIDADE = 0.9;
const LARGURA_MINIMA = 480;

interface FotoPadrao {
  url: string;
  alt: string;
  largura: number;
}

interface Vaga {
  chave: string;
  rotulo: string;
  onde: string;
  proporcao: string;
  padrao: FotoPadrao;
}

interface Grupo {
  titulo: string;
  descricao: string;
  vagas: Vaga[];
}

interface ItemDoAcervo {
  id: string;
  nome: string;
  alt: string;
  largura: number;
  altura: number;
  bytes: number;
  autorizacaoImagem: boolean;
  criadoEm: string;
  previa: string | null;
  vagas: string[];
}

interface Props {
  grupos: Grupo[];
  acervo: ItemDoAcervo[];
  atribuicoes: Record<string, string>;
}

/** Converte para WebP e limita o lado maior. Devolve o blob e as dimensões. */
async function prepararImagem(arquivo: File) {
  // `from-image` respeita a orientação gravada no EXIF ANTES de descartá-lo —
  // sem isso, foto de celular na vertical sobe deitada.
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext('2d');
  if (!contexto) throw new Error('O navegador não deixou preparar a imagem.');
  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolver) =>
    tela.toBlob(resolver, 'image/webp', QUALIDADE),
  );
  if (!blob) throw new Error('Não deu para converter a imagem.');
  return { blob, largura, altura };
}

const formatarPeso = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

async function pedir(url: string, corpo: unknown): Promise<{ erro?: string }> {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) return { erro: dados.erro ?? 'Algo deu errado. Tente de novo.' };
  return {};
}

export default function GerenciadorDeFotos({ grupos, acervo: acervoInicial, atribuicoes: iniciais }: Props) {
  const [acervo, setAcervo] = useState(acervoInicial);
  const [atribuicoes, setAtribuicoes] = useState(iniciais);
  const [vagaAberta, setVagaAberta] = useState<Vaga | null>(null);
  const [pendente, setPendente] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'certo'; texto: string } | null>(null);

  const porId = useMemo(() => new Map(acervo.map((i) => [i.id, i])), [acervo]);
  const todasAsVagas = useMemo(() => grupos.flatMap((g) => g.vagas), [grupos]);

  const fotoDaVaga = useCallback(
    (vaga: Vaga) => {
      const id = atribuicoes[vaga.chave];
      const item = id ? porId.get(id) : undefined;
      if (item?.previa) {
        return { url: item.previa, alt: item.alt, doAcervo: true, item };
      }
      return { url: vaga.padrao.url, alt: vaga.padrao.alt, doAcervo: false, item: undefined };
    },
    [atribuicoes, porId],
  );

  /**
   * Foto recém-enviada: entra no acervo E ocupa a vaga que estava aberta —
   * o botão promete "enviar e usar nesta posição", então enviar sem atribuir
   * seria a tela mentindo. O item já vem com a prévia assinada do servidor,
   * o que evita recarregar a página no meio da troca.
   */
  async function aoEnviar(item: ItemDoAcervo, chave: string) {
    setAcervo((lista) => [item, ...lista]);
    await usarNaVaga(chave, item.id);
  }

  async function usarNaVaga(chave: string, mediaId: string) {
    setPendente(true);
    const { erro } = await pedir('/api/painel/vaga', { chave, mediaId });
    setPendente(false);
    if (erro) return setAviso({ tipo: 'erro', texto: erro });
    setAtribuicoes((a) => ({ ...a, [chave]: mediaId }));
    setAcervo((lista) =>
      lista.map((i) => ({
        ...i,
        vagas: i.id === mediaId ? [...new Set([...i.vagas, chave])] : i.vagas.filter((c) => c !== chave),
      })),
    );
    setVagaAberta(null);
    setAviso({ tipo: 'certo', texto: 'Trocada. Publique para ir ao ar.' });
  }

  async function voltarAoPadrao(chave: string) {
    setPendente(true);
    const { erro } = await pedir('/api/painel/vaga', { chave, acao: 'limpar' });
    setPendente(false);
    if (erro) return setAviso({ tipo: 'erro', texto: erro });
    setAtribuicoes((a) => {
      const copia = { ...a };
      delete copia[chave];
      return copia;
    });
    setAcervo((lista) => lista.map((i) => ({ ...i, vagas: i.vagas.filter((c) => c !== chave) })));
    setVagaAberta(null);
    setAviso({ tipo: 'certo', texto: 'Voltou para a foto original do site.' });
  }

  async function apagar(id: string) {
    if (!window.confirm('Apagar esta foto do acervo? Não dá para desfazer.')) return;
    setPendente(true);
    const { erro } = await pedir('/api/painel/apagar', { mediaId: id });
    setPendente(false);
    if (erro) return setAviso({ tipo: 'erro', texto: erro });
    setAcervo((lista) => lista.filter((i) => i.id !== id));
    setAviso({ tipo: 'certo', texto: 'Foto apagada do acervo.' });
  }

  async function publicar() {
    setPublicando(true);
    const { erro } = await pedir('/api/painel/publicar', {});
    setPublicando(false);
    setAviso(
      erro
        ? { tipo: 'erro', texto: erro }
        : {
            tipo: 'certo',
            texto: 'Publicando. O site novo entra no ar em 1 a 2 minutos — pode fechar esta tela.',
          },
    );
  }

  const trocadas = todasAsVagas.filter((v) => atribuicoes[v.chave]).length;

  return (
    <div className="pn">
      <div className="pn__cabeca">
        <div>
          <p className="t-eyebrow">O que aparece no site</p>
          <h1 className="pn__titulo">Fotos do site</h1>
          <p className="pn__lead">
            Cada quadro abaixo é uma posição do site. Troque a foto de uma posição e clique em{' '}
            <strong>Publicar</strong> — o site novo entra no ar em 1 a 2 minutos. Foto enviada fica
            guardada no acervo e pode ser usada de novo depois.
          </p>
        </div>

        <div className="pn__publicar">
          <button className="btn btn-primario" onClick={publicar} disabled={publicando || pendente}>
            {publicando ? 'Publicando…' : 'Publicar no site'}
          </button>
          <p className="pn__contagem">
            {trocadas === 0
              ? 'Nenhuma posição trocada ainda'
              : `${trocadas} de ${todasAsVagas.length} posições com foto sua`}
          </p>
        </div>
      </div>

      {aviso && (
        <p className={`pn__aviso pn__aviso--${aviso.tipo}`} role="status">
          {aviso.texto}
          <button className="pn__fechar-aviso" onClick={() => setAviso(null)} aria-label="Fechar">
            ×
          </button>
        </p>
      )}

      {grupos.map((grupo) => (
        <section className="pn__grupo" key={grupo.titulo}>
          <h2 className="pn__grupo-titulo">{grupo.titulo}</h2>
          <p className="pn__grupo-desc">{grupo.descricao}</p>

          <ul className="pn__grade" role="list">
            {grupo.vagas.map((vaga) => {
              const foto = fotoDaVaga(vaga);
              return (
                <li className="pn__vaga" key={vaga.chave}>
                  <div className="pn__moldura" style={{ aspectRatio: vaga.proporcao }}>
                    <img src={foto.url} alt={foto.alt} loading="lazy" />
                    {!foto.doAcervo && <span className="pn__selo">Foto original do site</span>}
                  </div>
                  <p className="pn__vaga-rotulo">{vaga.rotulo}</p>
                  <p className="pn__vaga-onde">{vaga.onde}</p>
                  <button className="btn btn-secundario pn__trocar" onClick={() => setVagaAberta(vaga)}>
                    Trocar foto
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="pn__grupo">
        <h2 className="pn__grupo-titulo">O acervo</h2>
        <p className="pn__grupo-desc">
          Tudo o que você já enviou. Foto que está no ar em alguma posição não pode ser apagada —
          troque a posição antes.
        </p>

        {acervo.length === 0 ? (
          <p className="pn__vazio">
            Nada enviado ainda. Envie a primeira foto pelo botão “Trocar foto” de qualquer posição.
          </p>
        ) : (
          <ul className="pn__galeria" role="list">
            {acervo.map((item) => (
              <li className="pn__item" key={item.id}>
                <div className="pn__item-foto">
                  {item.previa ? <img src={item.previa} alt={item.alt} loading="lazy" /> : null}
                </div>
                <p className="pn__item-nome">{item.nome}</p>
                <p className="pn__item-meta">
                  {item.largura}×{item.altura} · {formatarPeso(item.bytes)}
                </p>
                {item.vagas.length > 0 && (
                  <p className="pn__item-uso">No ar em {item.vagas.length} posição(ões)</p>
                )}
                <button
                  className="pn__apagar"
                  onClick={() => apagar(item.id)}
                  disabled={pendente || item.vagas.length > 0}
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {vagaAberta && (
        <SeletorDeFoto
          vaga={vagaAberta}
          acervo={acervo}
          temAtribuicao={Boolean(atribuicoes[vagaAberta.chave])}
          onFechar={() => setVagaAberta(null)}
          onEscolher={(id) => usarNaVaga(vagaAberta.chave, id)}
          onVoltarAoPadrao={() => voltarAoPadrao(vagaAberta.chave)}
          onEnviado={(item) => aoEnviar(item, vagaAberta.chave)}
          ocupado={pendente}
        />
      )}
    </div>
  );
}

/** A folha que abre ao trocar uma foto: enviar nova, ou pegar do acervo. */
function SeletorDeFoto({
  vaga,
  acervo,
  temAtribuicao,
  onFechar,
  onEscolher,
  onVoltarAoPadrao,
  onEnviado,
  ocupado,
}: {
  vaga: Vaga;
  acervo: ItemDoAcervo[];
  temAtribuicao: boolean;
  onFechar: () => void;
  onEscolher: (id: string) => void;
  onVoltarAoPadrao: () => void;
  onEnviado: (item: ItemDoAcervo) => void;
  ocupado: boolean;
}) {
  const [aba, setAba] = useState<'enviar' | 'acervo'>(acervo.length ? 'acervo' : 'enviar');
  return (
    <div className="pn__folha" role="dialog" aria-modal="true" aria-label={`Trocar: ${vaga.rotulo}`}>
      <div className="pn__folha-fundo" onClick={onFechar} />
      <div className="pn__folha-corpo">
        <header className="pn__folha-topo">
          <div>
            <p className="t-eyebrow">Trocar foto</p>
            <h3 className="pn__folha-titulo">{vaga.rotulo}</h3>
            <p className="pn__vaga-onde">{vaga.onde}</p>
          </div>
          <button className="pn__fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="pn__abas" role="tablist">
          <button
            role="tab"
            aria-selected={aba === 'acervo'}
            className={aba === 'acervo' ? 'pn__aba pn__aba--ativa' : 'pn__aba'}
            onClick={() => setAba('acervo')}
          >
            Do acervo ({acervo.length})
          </button>
          <button
            role="tab"
            aria-selected={aba === 'enviar'}
            className={aba === 'enviar' ? 'pn__aba pn__aba--ativa' : 'pn__aba'}
            onClick={() => setAba('enviar')}
          >
            Enviar nova
          </button>
        </div>

        {aba === 'acervo' ? (
          acervo.length === 0 ? (
            <p className="pn__vazio">O acervo está vazio. Envie a primeira foto na outra aba.</p>
          ) : (
            <ul className="pn__escolha" role="list">
              {acervo.map((item) => (
                <li key={item.id}>
                  <button className="pn__escolha-item" onClick={() => onEscolher(item.id)} disabled={ocupado}>
                    {item.previa && <img src={item.previa} alt="" loading="lazy" />}
                    <span className="pn__escolha-nome">{item.nome}</span>
                    <span className="pn__item-meta">
                      {item.largura}×{item.altura}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <FormularioDeEnvio vaga={vaga} onPronto={onEnviado} />
        )}

        {temAtribuicao && (
          <footer className="pn__folha-pe">
            <button className="pn__link-perigo" onClick={onVoltarAoPadrao} disabled={ocupado}>
              Voltar para a foto original do site
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

/** Envio de uma foto nova, com conversão no browser. */
function FormularioDeEnvio({
  vaga,
  onPronto,
}: {
  vaga: Vaga;
  onPronto: (item: ItemDoAcervo) => void;
}) {
  const [arquivo, setArquivo] = useState<{ blob: Blob; largura: number; altura: number; nome: string } | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [autorizacao, setAutorizacao] = useState(false);
  const [temPessoa, setTemPessoa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function escolher(lista: FileList | null) {
    const bruto = lista?.[0];
    if (!bruto) return;
    setErro(null);
    try {
      const { blob, largura, altura } = await prepararImagem(bruto);
      if (largura < LARGURA_MINIMA) {
        setErro(
          `Essa imagem tem ${largura}px de largura. O mínimo é ${LARGURA_MINIMA}px — abaixo disso ela sai borrada no site.`,
        );
        return;
      }
      setArquivo({ blob, largura, altura, nome: bruto.name });
      setPrevia(URL.createObjectURL(blob));
    } catch {
      setErro('Não deu para ler essa imagem. Tente outro arquivo.');
    }
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!arquivo) return setErro('Escolha uma imagem.');
    if (temPessoa && !autorizacao) {
      return setErro(
        'Foto com pessoa identificável só entra com autorização de uso de imagem. Marque a confirmação ou escolha outra foto.',
      );
    }

    setEnviando(true);
    setErro(null);

    const corpo = new FormData();
    corpo.set('arquivo', new File([arquivo.blob], 'foto.webp', { type: 'image/webp' }));
    corpo.set('nome', arquivo.nome);
    corpo.set('alt', alt);
    corpo.set('temPessoa', temPessoa ? 'sim' : 'nao');
    corpo.set('autorizacao', autorizacao ? 'sim' : 'nao');

    const resposta = await fetch('/api/painel/enviar', { method: 'POST', body: corpo });
    const dados = await resposta.json().catch(() => ({}));
    setEnviando(false);

    if (!resposta.ok) return setErro(dados.erro ?? 'Não deu para enviar. Tente de novo.');
    if (!dados.item) return setErro('O envio terminou sem resposta. Recarregue a página.');
    onPronto(dados.item as ItemDoAcervo);
  }

  return (
    <form className="pn__envio" onSubmit={enviar}>
      <div
        className="pn__solta"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void escolher(e.dataTransfer.files);
        }}
      >
        {previa ? (
          <img src={previa} alt="" style={{ aspectRatio: vaga.proporcao }} />
        ) : (
          <p>Arraste a foto aqui, ou escolha do aparelho.</p>
        )}
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          className="so-leitor"
          onChange={(e) => void escolher(e.target.files)}
        />
        <button type="button" className="btn btn-secundario" onClick={() => entrada.current?.click()}>
          {previa ? 'Escolher outra' : 'Escolher a foto'}
        </button>
        {arquivo && (
          <p className="pn__item-meta">
            {arquivo.largura}×{arquivo.altura} · {formatarPeso(arquivo.blob.size)} · convertida para WebP
          </p>
        )}
      </div>

      <label className="pn__campo">
        <span className="t-eyebrow">Descreva a foto</span>
        <textarea
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Ex.: Salão à noite, luz baixa e mesas cheias, com a parrilla acesa ao fundo."
          required
        />
        <span className="pn__ajuda">
          É o que quem usa leitor de tela recebe no lugar da imagem, e o que aparece se a foto não
          carregar. Descreva a cena.
        </span>
      </label>

      <fieldset className="pn__campo pn__campo--caixa">
        <legend className="t-eyebrow">Direito de imagem</legend>
        <label className="pn__marca">
          <input type="checkbox" checked={temPessoa} onChange={(e) => setTemPessoa(e.target.checked)} />
          <span>Aparece alguém reconhecível nesta foto (cliente ou equipe)</span>
        </label>
        {temPessoa && (
          <label className="pn__marca">
            <input
              type="checkbox"
              checked={autorizacao}
              onChange={(e) => setAutorizacao(e.target.checked)}
            />
            <span>
              Confirmo que existe autorização de uso de imagem registrada para todas as pessoas que
              aparecem.
            </span>
          </label>
        )}
      </fieldset>

      {erro && (
        <p className="pn__aviso pn__aviso--erro" role="alert">
          {erro}
        </p>
      )}

      <button className="btn btn-primario" type="submit" disabled={enviando || !arquivo}>
        {enviando ? 'Enviando…' : 'Enviar e usar nesta posição'}
      </button>
    </form>
  );
}
