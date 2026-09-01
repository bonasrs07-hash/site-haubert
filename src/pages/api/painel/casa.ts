/**
 * Escritas da identidade da casa. Sessão já validada pelo middleware.
 * Mesmo desenho do endpoint de cardápio: uma rota com `acao`, porque a
 * autorização é idêntica para todas e a validação vive na camada de serviços.
 */
import type { APIRoute } from 'astro';
import { salvarContato, salvarMarca, type Resultado } from '@/lib/identidade';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }

  const { supabase, casaId } = locals.sessao;
  let r: Resultado;

  switch (corpo.acao) {
    case 'contato':
      r = await salvarContato(supabase, casaId, {
        endereco: corpo.endereco,
        telefone: corpo.telefone,
        whatsapp: corpo.whatsapp,
      });
      break;
    case 'marca':
      r = await salvarMarca(supabase, casaId, {
        slug: corpo.slug,
        instagram: corpo.instagram,
        horario: corpo.horario,
      });
      break;
    default:
      return json({ erro: 'Ação desconhecida.' }, 400);
  }

  return r.ok ? json({ ok: true }) : json({ erro: r.erro }, r.status);
};
