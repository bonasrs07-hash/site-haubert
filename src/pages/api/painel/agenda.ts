/** Escritas da agenda. Sessão já validada pelo middleware. */
import type { APIRoute } from 'astro';
import { apagarEvento, criarEvento, editarEvento, type Resultado } from '@/lib/agenda-mutacoes';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  let c: Record<string, unknown>;
  try {
    c = await request.json();
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }

  const { supabase, casaId } = locals.sessao;
  const entrada = {
    titulo: c.titulo,
    descricao: c.descricao,
    inicio: c.inicio,
    fim: c.fim,
    lineup: c.lineup,
    marcaSlug: c.marcaSlug,
    publicado: c.publicado,
  };
  let r: Resultado;

  switch (c.acao) {
    case 'criar':
      r = await criarEvento(supabase, casaId, entrada);
      break;
    case 'editar':
      r = await editarEvento(supabase, casaId, c.id, entrada);
      break;
    case 'apagar':
      r = await apagarEvento(supabase, casaId, c.id);
      break;
    default:
      return json({ erro: 'Ação desconhecida.' }, 400);
  }

  return r.ok ? json({ ok: true }) : json({ erro: r.erro }, r.status);
};
