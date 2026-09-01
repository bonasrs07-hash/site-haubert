/** Manda o site reconstruir para as trocas irem ao ar. (ADR-008) */
import type { APIRoute } from 'astro';
import { publicar } from '@/lib/midia';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ locals }) => {
  const resultado = await publicar(locals.sessao);
  if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);
  return json({ ok: true });
};
