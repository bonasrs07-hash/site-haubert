/** Tira uma foto da galeria. Foto no ar não sai, ver `apagarDaGaleria`. */
import type { APIRoute } from 'astro';
import { apagarDaGaleria } from '@/lib/midia';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  let corpo: { mediaId?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }
  const resultado = await apagarDaGaleria(locals.sessao, corpo.mediaId);
  if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);
  return json({ ok: true });
};
