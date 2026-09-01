/**
 * Editor de cardápio. Segunda ilha React do projeto, mesma justificativa da
 * primeira (ADR-006): formulários aninhados, salvar por linha, reordenar e
 * estado de erro por campo são estado real, não conteúdo.
 *
 * Como no painel de fotos, a ilha só embarca em `/painel/cardapio` — as
 * páginas públicas continuam sem React, e isso é medido por
 * `npm run orcamento:js`, não presumido.
 *
 * Nada aqui salva sozinho. Cardápio é preço: salvar no `blur` transforma um
 * clique errado em preço errado no ar. Cada linha tem o seu "Salvar", e ele
 * só acende quando há o que salvar.
 */
import { useCallback, useState } from 'react';
import './painel.css';

interface Item {
  id: string;
  nome: string;
  descricao: string;
  precoCents: number | null;
  publicado: boolean;
  ordem: number;
}

interface Secao {
  id: string;
  nome: string;
  descricao: string;
  publicado: boolean;
  ordem: number;
  itens: Item[];
}

interface Props {
  secoes: Secao[];
}

const emReais = (cents: number | null) =>
  cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',');

async function pedir(corpo: Record<string, unknown>): Promise<string | null> {
  const resposta = await fetch('/api/painel/cardapio', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (resposta.ok) return null;
  const dados = await resposta.json().catch(() => ({}));
  return dados.erro ?? 'Algo deu errado. Tente de novo.';
}

export default function EditorDeCardapio({ secoes }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /** Toda escrita recarrega. O cardápio é lido no build; a tela só precisa
      refletir o banco, e recarregar é mais honesto que remontar estado a mão. */
  const executar = useCallback(async (corpo: Record<string, unknown>) => {
    setOcupado(true);
    const falha = await pedir(corpo);
    setOcupado(false);
    if (falha) return setErro(falha);
    window.location.reload();
  }, []);

  const totalItens = secoes.reduce((n, s) => n + s.itens.length, 0);
  const publicados = secoes.filter((s) => s.publicado).length;

  return (
    <div className="pn">
      <header className="pn__cabeca">
        <h1 className="pn__titulo">Cardápio</h1>
        <p className="pn__lead">
          Monte em seções e itens. Nada aparece no site enquanto a seção e o item não estiverem
          marcados como <strong>no site</strong> — e só entra de verdade depois de publicar em{' '}
          <a className="link" href="/painel">
            Fotos
          </a>
          .
        </p>
        <p className="pn__placar">
          <span className="pn__placar-num">{secoes.length}</span> seções ·{' '}
          <span className="pn__placar-num">{totalItens}</span> itens ·{' '}
          <span className="pn__placar-num">{publicados}</span> seções no site
        </p>
      </header>

      {erro && (
        <p className="pn__aviso pn__aviso--erro" role="alert">
          {erro}
          <button className="pn__fechar-aviso" onClick={() => setErro(null)} aria-label="Fechar">
            ×
          </button>
        </p>
      )}

      {secoes.length === 0 && (
        <p className="pn__vazio">
          O cardápio ainda está vazio. Enquanto estiver, o site mostra os seis cortes do guia sem
          preço — que é o que ele já mostra hoje.
        </p>
      )}

      {secoes.map((secao, i) => (
        <LinhaSecao
          key={secao.id}
          secao={secao}
          primeira={i === 0}
          ultima={i === secoes.length - 1}
          ocupado={ocupado}
          executar={executar}
        />
      ))}

      <NovaSecao ocupado={ocupado} executar={executar} />
    </div>
  );
}

function LinhaSecao({
  secao,
  primeira,
  ultima,
  ocupado,
  executar,
}: {
  secao: Secao;
  primeira: boolean;
  ultima: boolean;
  ocupado: boolean;
  executar: (c: Record<string, unknown>) => void;
}) {
  const [nome, setNome] = useState(secao.nome);
  const [descricao, setDescricao] = useState(secao.descricao);
  const [publicado, setPublicado] = useState(secao.publicado);
  const sujo =
    nome !== secao.nome || descricao !== secao.descricao || publicado !== secao.publicado;

  return (
    <section className="cd__secao">
      <div className="cd__secao-topo">
        <div className="cd__campos">
          <label className="pn__campo">
            <span className="t-eyebrow">Seção</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
          </label>
          <label className="pn__campo">
            <span className="t-eyebrow">Descrição da seção</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={200}
              placeholder="Opcional"
            />
          </label>
        </div>

        <div className="cd__acoes">
          <label className="pn__marca cd__marca">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
            />
            <span>No site</span>
          </label>
          <button
            className="cd__mover"
            onClick={() => executar({ acao: 'secao.mover', id: secao.id, direcao: 'cima' })}
            disabled={ocupado || primeira}
            aria-label="Subir seção"
          >
            ↑
          </button>
          <button
            className="cd__mover"
            onClick={() => executar({ acao: 'secao.mover', id: secao.id, direcao: 'baixo' })}
            disabled={ocupado || ultima}
            aria-label="Descer seção"
          >
            ↓
          </button>
          <button
            className="btn btn-secundario cd__salvar"
            disabled={ocupado || !sujo}
            onClick={() =>
              executar({ acao: 'secao.editar', id: secao.id, nome, descricao, publicado })
            }
          >
            Salvar
          </button>
          <button
            className="pn__apagar"
            disabled={ocupado}
            onClick={() => {
              const aviso = secao.itens.length
                ? `Apagar "${secao.nome}" e os ${secao.itens.length} itens dentro dela?`
                : `Apagar a seção "${secao.nome}"?`;
              if (window.confirm(aviso)) executar({ acao: 'secao.apagar', id: secao.id });
            }}
          >
            Apagar seção
          </button>
        </div>
      </div>

      <ul className="cd__itens" role="list">
        {secao.itens.map((item, i) => (
          <LinhaItem
            key={item.id}
            item={item}
            primeiro={i === 0}
            ultimo={i === secao.itens.length - 1}
            ocupado={ocupado}
            executar={executar}
          />
        ))}
      </ul>

      <NovoItem secaoId={secao.id} ocupado={ocupado} executar={executar} />
    </section>
  );
}

function LinhaItem({
  item,
  primeiro,
  ultimo,
  ocupado,
  executar,
}: {
  item: Item;
  primeiro: boolean;
  ultimo: boolean;
  ocupado: boolean;
  executar: (c: Record<string, unknown>) => void;
}) {
  const [nome, setNome] = useState(item.nome);
  const [descricao, setDescricao] = useState(item.descricao);
  const [preco, setPreco] = useState(emReais(item.precoCents));
  const [publicado, setPublicado] = useState(item.publicado);
  const sujo =
    nome !== item.nome ||
    descricao !== item.descricao ||
    preco !== emReais(item.precoCents) ||
    publicado !== item.publicado;

  return (
    <li className="cd__item">
      <div className="cd__item-campos">
        <label className="pn__campo cd__campo-nome">
          <span className="t-eyebrow">Item</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
        </label>
        <label className="pn__campo cd__campo-preco">
          <span className="t-eyebrow">Preço</span>
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            inputMode="decimal"
            placeholder="vazio = não divulgado"
          />
        </label>
      </div>

      <label className="pn__campo">
        <span className="t-eyebrow">Descrição</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={240}
          placeholder="Opcional"
        />
      </label>

      <div className="cd__acoes">
        <label className="pn__marca cd__marca">
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
          />
          <span>No site</span>
        </label>
        <button
          className="cd__mover"
          onClick={() => executar({ acao: 'item.mover', id: item.id, direcao: 'cima' })}
          disabled={ocupado || primeiro}
          aria-label="Subir item"
        >
          ↑
        </button>
        <button
          className="cd__mover"
          onClick={() => executar({ acao: 'item.mover', id: item.id, direcao: 'baixo' })}
          disabled={ocupado || ultimo}
          aria-label="Descer item"
        >
          ↓
        </button>
        <button
          className="btn btn-secundario cd__salvar"
          disabled={ocupado || !sujo}
          onClick={() =>
            executar({ acao: 'item.editar', id: item.id, nome, descricao, preco, publicado })
          }
        >
          Salvar
        </button>
        <button
          className="pn__apagar"
          disabled={ocupado}
          onClick={() => {
            if (window.confirm(`Apagar "${item.nome}"?`)) {
              executar({ acao: 'item.apagar', id: item.id });
            }
          }}
        >
          Apagar
        </button>
      </div>
    </li>
  );
}

function NovaSecao({
  ocupado,
  executar,
}: {
  ocupado: boolean;
  executar: (c: Record<string, unknown>) => void;
}) {
  const [nome, setNome] = useState('');
  return (
    <form
      className="cd__nova"
      onSubmit={(e) => {
        e.preventDefault();
        if (nome.trim().length >= 2) executar({ acao: 'secao.criar', nome, descricao: '' });
      }}
    >
      <label className="pn__campo">
        <span className="t-eyebrow">Nova seção</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          placeholder="Ex.: Os cortes, Cafés, Drinks"
        />
      </label>
      <button className="btn btn-primario" type="submit" disabled={ocupado || nome.trim().length < 2}>
        Criar seção
      </button>
    </form>
  );
}

function NovoItem({
  secaoId,
  ocupado,
  executar,
}: {
  secaoId: string;
  ocupado: boolean;
  executar: (c: Record<string, unknown>) => void;
}) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  return (
    <form
      className="cd__nova cd__nova--item"
      onSubmit={(e) => {
        e.preventDefault();
        if (nome.trim().length >= 2) {
          executar({ acao: 'item.criar', secaoId, nome, descricao: '', preco });
        }
      }}
    >
      <label className="pn__campo cd__campo-nome">
        <span className="t-eyebrow">Novo item</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
          placeholder="Ex.: Picanha"
        />
      </label>
      <label className="pn__campo cd__campo-preco">
        <span className="t-eyebrow">Preço</span>
        <input
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          inputMode="decimal"
          placeholder="opcional"
        />
      </label>
      <button className="btn btn-secundario" type="submit" disabled={ocupado || nome.trim().length < 2}>
        Adicionar
      </button>
    </form>
  );
}
