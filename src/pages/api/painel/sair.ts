import type { APIRoute } from 'astro';
import { limparSessao } from '@/lib/sessao';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  limparSessao(cookies);
  return new Response(null, { status: 302, headers: { location: '/painel/entrar' } });
};
