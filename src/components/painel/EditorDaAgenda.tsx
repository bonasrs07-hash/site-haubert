/**
 * Editor da agenda. Quarta e última ilha, mesma justificativa (ADR-006).
 *
 * A regra que molda esta tela: **nada aparece no site com data errada**. O
 * BLK-007 adiou datas por isso mesmo — "data errada queima mais confiança que
 * a ausência dela" — e o que destravou não foi mudar de ideia, foi existir um
 * lugar onde o dono corrige em trinta segundos.
 *
 * Por isso o evento nasce despublicado, e o rótulo diz o que "no site"
 * significa em vez de deixar o dono adivinhar.
 */
import { useState } from 'react';
import { paraCampoLocal } from '@/lib/agenda';
import './painel.css';

interface Evento {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  inicioEm: string;
  fimEm: string | null;
  lineup: string[];
  marcaSlug: string | null;
  publicado: boolean;
}

interface Marca {
  slug: string;
  nomeCurto: string;
}

async function pedir(corpo: Record<string, unknown>): Promise<string | null> {
  const r = await fetch('/api/painel/agenda', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.erro ?? 'Algo deu errado. Tente de novo.';
}

const quandoLegivel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));

export default function EditorDaAgenda({
  eventos,
  marcas,
}: {
  eventos: Evento[];
  marcas: Marca[];
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(corpo: Record<string, unknown>) {
    setOcupado(true);
    const falha = await pedir(corpo);
    setOcupado(false);
    if (falha) return setErro(falha);
    window.location.reload();
  }

  const agora = Date.now();
  const futuros = eventos.filter(
    (e) => new Date(e.fimEm ?? e.inicioEm).getTime() >= agora - 6 * 3600 * 1000,
  );
  const passados = eventos.filter((e) => !futuros.includes(e));
  const noSite = futuros.filter((e) => e.publicado).length;

  return (
    <div className="pn">
      <header className="pn__cabeca">
        <h1 className="pn__titulo">Agenda</h1>
        <p className="pn__lead">
          Evento novo nasce <strong>fora do site</strong>. Marque &ldquo;no site&rdquo; quando a
          data estiver confirmada, e publique em{' '}
          <a className="link" href="/painel">
            Fotos
          </a>
          . Evento que já passou some sozinho da agenda.
        </p>
        <p className="pn__placar">
          <span className="pn__placar-num">{noSite}</span> no site ·{' '}
          <span className="pn__placar-num">{futuros.length}</span> por vir ·{' '}
          <span className="pn__placar-num">{passados.length}</span> já foram
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

      <NovoEvento marcas={marcas} ocupado={ocupado} executar={executar} />

      {futuros.length === 0 && (
        <p className="pn__vazio">
          Nenhuma data marcada. Enquanto não houver, a página mostra os encontros por cadência,
          sem inventar dia.
        </p>
      )}

      {futuros.map((e) => (
        <LinhaEvento key={e.id} evento={e} marcas={marcas} ocupado={ocupado} executar={executar} />
      ))}

      {passados.length > 0 && (
        <section className="cd__secao">
          <h2 className="pn__grupo-titulo">Já aconteceram</h2>
          <p className="pn__grupo-desc">
            Fora da agenda, mas as páginas continuam no ar para que link compartilhado não morra.
          </p>
          <ul className="ag__passados" role="list">
            {passados.map((e) => (
              <li key={e.id}>
                <span>{quandoLegivel(e.inicioEm)}</span> — <strong>{e.titulo}</strong>
                <button
                  className="pn__apagar"
                  disabled={ocupado}
                  onClick={() => {
                    if (window.confirm(`Apagar "${e.titulo}"? O link dele deixa de existir.`)) {
                      executar({ acao: 'apagar', id: e.id });
                    }
                  }}
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Campos({
  valores,
  set,
  marcas,
}: {
  valores: Record<string, string | boolean>;
  set: (k: string, v: string | boolean) => void;
  marcas: Marca[];
}) {
  return (
    <>
      <label className="pn__campo">
        <span className="t-eyebrow">Nome do evento</span>
        <input
          value={String(valores.titulo)}
          onChange={(e) => set('titulo', e.target.value)}
          maxLength={80}
          placeholder="Ex.: In The Flow"
        />
      </label>

      <div className="cd__item-campos">
        <label className="pn__campo">
          <span className="t-eyebrow">Começa</span>
          <input
            type="datetime-local"
            value={String(valores.inicio)}
            onChange={(e) => set('inicio', e.target.value)}
          />
        </label>
        <label className="pn__campo">
          <span className="t-eyebrow">Termina</span>
          <input
            type="datetime-local"
            value={String(valores.fim)}
            onChange={(e) => set('fim', e.target.value)}
          />
        </label>
      </div>

      <label className="pn__campo">
        <span className="t-eyebrow">Descrição</span>
        <input
          value={String(valores.descricao)}
          onChange={(e) => set('descricao', e.target.value)}
          maxLength={400}
          placeholder="Opcional"
        />
      </label>

      <div className="cd__item-campos">
        <label className="pn__campo">
          <span className="t-eyebrow">Line-up</span>
          <input
            value={String(valores.lineup)}
            onChange={(e) => set('lineup', e.target.value)}
            placeholder="Separe por vírgula"
          />
        </label>
        <label className="pn__campo">
          <span className="t-eyebrow">Marca</span>
          <select
            value={String(valores.marcaSlug)}
            onChange={(e) => set('marcaSlug', e.target.value)}
          >
            <option value="">A casa toda</option>
            {marcas.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.nomeCurto}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function NovoEvento({
  marcas,
  ocupado,
  executar,
}: {
  marcas: Marca[];
  ocupado: boolean;
  executar: (c: Record<string, unknown>) => void;
}) {
  const [v, setV] = useState<Record<string, string | boolean>>({
    titulo: '',
    descricao: '',
    inicio: '',
    fim: '',
    lineup: '',
    marcaSlug: '',
  });
  const set = (k: string, x: string | boolean) => setV((o) => ({ ...o, [k]: x }));

  return (
    <section className="cd__secao">
      <h2 className="pn__grupo-titulo">Marcar um evento</h2>
      <Campos valores={v} set={set} marcas={marcas} />
      <div className="cd__acoes">
        <button
          className="btn btn-primario cd__salvar"
          disabled={ocupado || String(v.titulo).trim().length < 2 || !v.inicio}
          onClick={() => executar({ acao: 'criar', ...v, publicado: false })}
        >
          Criar
        </button>
      </div>
    </section>
  );
}

function LinhaEvento({
  evento,
  marcas,
  ocupado,
  executar,
}: {
  evento: Evento;
  marcas: Marca[];
  ocupado: boolean;
  executar: (c: Record<string, unknown>) => void;
}) {
  const inicial = {
    titulo: evento.titulo,
    descricao: evento.descricao,
    inicio: paraCampoLocal(evento.inicioEm),
    fim: evento.fimEm ? paraCampoLocal(evento.fimEm) : '',
    lineup: evento.lineup.join(', '),
    marcaSlug: evento.marcaSlug ?? '',
    publicado: evento.publicado,
  };
  const [v, setV] = useState<Record<string, string | boolean>>(inicial);
  const set = (k: string, x: string | boolean) => setV((o) => ({ ...o, [k]: x }));
  const sujo = JSON.stringify(v) !== JSON.stringify(inicial);

  return (
    <section className={evento.publicado ? 'cd__secao' : 'cd__secao ag__rascunho'}>
      <h2 className="pn__grupo-titulo">
        {evento.titulo}
        {!evento.publicado && <span className="ag__marca-rascunho"> fora do site</span>}
      </h2>
      <p className="pn__grupo-desc">
        {quandoLegivel(evento.inicioEm)} · /evento/{evento.slug}
      </p>

      <Campos valores={v} set={set} marcas={marcas} />

      <div className="cd__acoes">
        <label className="pn__marca cd__marca">
          <input
            type="checkbox"
            checked={Boolean(v.publicado)}
            onChange={(e) => set('publicado', e.target.checked)}
          />
          <span>No site</span>
        </label>
        <button
          className="btn btn-secundario cd__salvar"
          disabled={ocupado || !sujo}
          onClick={() => executar({ acao: 'editar', id: evento.id, ...v })}
        >
          Salvar
        </button>
        <button
          className="pn__apagar"
          disabled={ocupado}
          onClick={() => {
            if (window.confirm(`Apagar "${evento.titulo}"? O link dele deixa de existir.`)) {
              executar({ acao: 'apagar', id: evento.id });
            }
          }}
        >
          Apagar
        </button>
      </div>
    </section>
  );
}
