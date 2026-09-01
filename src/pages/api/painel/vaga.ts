/** Aponta (ou solta) uma posição de foto do site. (ADR-008) */
import type { APIRoute } from 'astro';
import { definirVaga, limparVaga } from '@/lib/midia';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  let corpo: { chave?: unknown; mediaId?: unknown; acao?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }

  const resultado =
    corpo.acao === 'limpar'
      ? await limparVaga(locals.sessao, corpo.chave)
      : await definirVaga(locals.sessao, corpo.chave, corpo.mediaId);

  if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);
  return json({ ok: true });
};
