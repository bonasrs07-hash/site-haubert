/**
 * Editor dos dados da casa. Terceira ilha, mesma justificativa das outras
 * (ADR-006): faixas de horário com dias marcáveis, salvar por bloco e
 * pré-visualização derivada são estado real.
 *
 * A pré-visualização não é enfeite: ela usa a MESMA função que gera a frase no
 * site (`formatarHorario`). O dono marca os dias e lê, ali, exatamente o que o
 * visitante vai ler. Sem isso, editar horário é preencher formulário no escuro
 * e descobrir o resultado dois minutos depois, no ar.
 */
import { useState } from 'react';
import { formatarHorario } from '@/lib/horario-texto';
import type { FaixaHorario } from '@/lib/tipos';
import './painel.css';

interface Marca {
  slug: string;
  nome: string;
  nomeCurto: string;
  instagram: string;
  horario: FaixaHorario[];
  horarioLegivel: string;
}

interface Casa {
  nome: string;
  cidade: string;
  uf: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  marcas: Marca[];
}

/** Domingo é 0, como em `Date.getDay()` e como no resto do projeto. */
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

async function pedir(corpo: Record<string, unknown>): Promise<string | null> {
  const r = await fetch('/api/painel/casa', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.erro ?? 'Algo deu errado. Tente de novo.';
}

export default function EditorDaCasa({ casa }: { casa: Casa }) {
  const [erro, setErro] = useState<string | null>(null);
  const [certo, setCerto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(corpo: Record<string, unknown>, aviso: string) {
    setOcupado(true);
    setErro(null);
    const falha = await pedir(corpo);
    setOcupado(false);
    if (falha) return setErro(falha);
    setCerto(aviso);
  }

  return (
    <div className="pn">
      <header className="pn__cabeca">
        <h1 className="pn__titulo">A casa</h1>
        <p className="pn__lead">
          Endereço, contato e horários. É daqui que saem o botão de reserva, a bolinha de
          &ldquo;aberto agora&rdquo; e a ficha que o Google lê. Depois de salvar, publique em{' '}
          <a className="link" href="/painel">
            Fotos
          </a>{' '}
          para ir ao site.
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
      {certo && (
        <p className="pn__aviso" role="status">
          {certo}
          <button className="pn__fechar-aviso" onClick={() => setCerto(null)} aria-label="Fechar">
            ×
          </button>
        </p>
      )}

      <BlocoContato casa={casa} ocupado={ocupado} salvar={salvar} />

      {casa.marcas.map((m) => (
        <BlocoMarca key={m.slug} marca={m} ocupado={ocupado} salvar={salvar} />
      ))}
    </div>
  );
}

function BlocoContato({
  casa,
  ocupado,
  salvar,
}: {
  casa: Casa;
  ocupado: boolean;
  salvar: (c: Record<string, unknown>, aviso: string) => void;
}) {
  const [endereco, setEndereco] = useState(casa.endereco);
  const [telefone, setTelefone] = useState(casa.telefone);
  const [whatsapp, setWhatsapp] = useState(casa.whatsapp);
  const sujo =
    endereco !== casa.endereco || telefone !== casa.telefone || whatsapp !== casa.whatsapp;

  return (
    <section className="cd__secao">
      <h2 className="pn__grupo-titulo">Onde e como falar</h2>
      <p className="pn__grupo-desc">
        {casa.cidade} · {casa.uf}. Enquanto o endereço estiver vazio, o site mostra só a cidade,
        em vez de inventar uma rua.
      </p>

      <label className="pn__campo">
        <span className="t-eyebrow">Endereço completo</span>
        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          maxLength={160}
          placeholder="Rua, número, bairro"
        />
      </label>

      <div className="cd__item-campos">
        <label className="pn__campo">
          <span className="t-eyebrow">WhatsApp da reserva</span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            maxLength={20}
            inputMode="tel"
            placeholder="+55 51 90000-0000"
          />
          <span className="pn__ajuda">
            É o que faz o botão &ldquo;Reservar mesa&rdquo; abrir a conversa com a mensagem
            pronta. Vazio, ele cai no Instagram da marca.
          </span>
        </label>
        <label className="pn__campo">
          <span className="t-eyebrow">Telefone</span>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            maxLength={20}
            inputMode="tel"
            placeholder="Opcional"
          />
        </label>
      </div>

      <div className="cd__acoes">
        <button
          className="btn btn-primario cd__salvar"
          disabled={ocupado || !sujo}
          onClick={() => salvar({ acao: 'contato', endereco, telefone, whatsapp }, 'Contato salvo.')}
        >
          Salvar
        </button>
      </div>
    </section>
  );
}

function BlocoMarca({
  marca,
  ocupado,
  salvar,
}: {
  marca: Marca;
  ocupado: boolean;
  salvar: (c: Record<string, unknown>, aviso: string) => void;
}) {
  const [instagram, setInstagram] = useState(marca.instagram);
  const [faixas, setFaixas] = useState<FaixaHorario[]>(marca.horario);

  const original = JSON.stringify(marca.horario);
  const sujo = instagram !== marca.instagram || JSON.stringify(faixas) !== original;

  const trocar = (i: number, mudanca: Partial<FaixaHorario>) =>
    setFaixas((f) => f.map((x, j) => (j === i ? { ...x, ...mudanca } : x)));

  const virarDia = (i: number, dia: number) =>
    setFaixas((f) =>
      f.map((x, j) =>
        j === i
          ? {
              ...x,
              dias: x.dias.includes(dia)
                ? x.dias.filter((d) => d !== dia)
                : [...x.dias, dia].sort((a, b) => a - b),
            }
          : x,
      ),
    );

  // A MESMA função que escreve a frase no site. O dono lê aqui o que o
  // visitante vai ler lá.
  const previa = formatarHorario(faixas);

  return (
    <section className="cd__secao">
      <h2 className="pn__grupo-titulo">{marca.nome}</h2>

      <label className="pn__campo">
        <span className="t-eyebrow">Instagram</span>
        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          maxLength={40}
          placeholder="@perfil"
        />
      </label>

      <p className="t-eyebrow" style={{ marginTop: 'var(--esp-2)' }}>
        Horários
      </p>

      <ul className="cd__itens" role="list">
        {faixas.map((f, i) => (
          <li className="cd__item" key={i}>
            <div className="ca__dias" role="group" aria-label={`Dias da faixa ${i + 1}`}>
              {DIAS.map((letra, dia) => (
                <button
                  key={dia}
                  type="button"
                  className={f.dias.includes(dia) ? 'ca__dia ca__dia--on' : 'ca__dia'}
                  onClick={() => virarDia(i, dia)}
                  aria-pressed={f.dias.includes(dia)}
                  aria-label={NOME_DIA[dia]}
                >
                  {letra}
                </button>
              ))}
            </div>

            <div className="cd__item-campos">
              <label className="pn__campo">
                <span className="t-eyebrow">Abre</span>
                <input
                  type="time"
                  value={f.abre}
                  onChange={(e) => trocar(i, { abre: e.target.value })}
                />
              </label>
              <label className="pn__campo">
                <span className="t-eyebrow">Fecha</span>
                <input
                  type="time"
                  value={f.fecha}
                  onChange={(e) => trocar(i, { fecha: e.target.value })}
                />
              </label>
            </div>

            <button
              className="pn__apagar"
              onClick={() => setFaixas((x) => x.filter((_, j) => j !== i))}
              disabled={ocupado}
            >
              Remover faixa
            </button>
          </li>
        ))}
      </ul>

      <button
        className="btn btn-secundario"
        onClick={() => setFaixas((f) => [...f, { dias: [], abre: '19:00', fecha: '23:00' }])}
        disabled={ocupado || faixas.length >= 8}
      >
        Adicionar faixa
      </button>

      <p className="ca__previa">
        No site vai aparecer: <strong>{previa || 'nada, enquanto não houver faixa'}</strong>
      </p>

      <div className="cd__acoes">
        <button
          className="btn btn-primario cd__salvar"
          disabled={ocupado || !sujo}
          onClick={() =>
            salvar(
              { acao: 'marca', slug: marca.slug, instagram, horario: faixas },
              `${marca.nome} salva.`,
            )
          }
        >
          Salvar
        </button>
      </div>
    </section>
  );
}
