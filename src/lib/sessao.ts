/**
 * Sessão do painel. (ADR-008, docs/11_SEGURANCA)
 *
 * O dono entra com e-mail e senha; os tokens do Supabase Auth ficam em cookies
 * `httpOnly`. É servidor puro — nada aqui chega ao browser, e a ilha React do
 * painel nunca vê um token.
 *
 * A regra que sustenta tudo: **a sessão é validada contra o servidor de Auth a
 * cada requisição**, com `getUser()`. Ler o JWT do cookie e acreditar nele é o
 * erro clássico — cookie é entrada do usuário, e assinatura só vale se alguém
 * conferir. `getSession()` não confere; `getUser()` confere.
 *
 * Estar logado não é estar autorizado: depois de saber QUEM é, ainda é preciso
 * saber se essa pessoa pertence a ESTA casa (`venue_members`). Quem decide isso
 * de verdade é a RLS, no banco; a checagem daqui existe para não renderizar o
 * painel para quem não tem nada a fazer nele. (ADR-002 — nada de e-mail de dono
 * hardcodado)
 */
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonimo, supabaseComToken } from './supabase';

const COOKIE_ACESSO = 'casa_acesso';
const COOKIE_ATUALIZACAO = 'casa_atualizacao';

/** 30 dias: o refresh token é o que sobrevive; o de acesso dura ~1h. */
const DIAS = 60 * 60 * 24 * 30;

export interface Sessao {
  usuarioId: string;
  email: string;
  casaId: string;
  casaSlug: string;
  papel: string;
  /** Cliente já autenticado como o dono. Toda escrita do painel passa por ele. */
  supabase: SupabaseClient;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
}

const opcoesDoCookie = (producao: boolean) =>
  ({
    httpOnly: true,
    secure: producao,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: DIAS,
  });

export function gravarSessao(cookies: AstroCookies, tokens: Tokens): void {
  const producao = import.meta.env.PROD;
  cookies.set(COOKIE_ACESSO, tokens.access_token, opcoesDoCookie(producao));
  cookies.set(COOKIE_ATUALIZACAO, tokens.refresh_token, opcoesDoCookie(producao));
}

export function limparSessao(cookies: AstroCookies): void {
  cookies.delete(COOKIE_ACESSO, { path: '/' });
  cookies.delete(COOKIE_ATUALIZACAO, { path: '/' });
}

/**
 * Quem está aí? Devolve `null` para qualquer coisa que não seja um membro
 * válido desta casa — sem distinguir "não logado" de "logado e sem acesso".
 * Quem chama trata os dois do mesmo jeito: manda para a tela de entrar.
 */
export async function lerSessao(cookies: AstroCookies): Promise<Sessao | null> {
  const acesso = cookies.get(COOKIE_ACESSO)?.value;
  const atualizacao = cookies.get(COOKIE_ATUALIZACAO)?.value;
  if (!acesso && !atualizacao) return null;

  const slug = import.meta.env.PUBLIC_VENUE_SLUG;
  if (!slug) return null;

  let token = acesso ?? '';
  let supabase = token ? supabaseComToken(token) : null;
  let usuario = supabase ? (await supabase.auth.getUser()).data.user : null;

  // Token de acesso vencido: tenta renovar com o de atualização antes de
  // devolver a pessoa para a tela de login. Sem isto, o dono seria deslogado
  // a cada hora no meio de um envio.
  if (!usuario && atualizacao) {
    // Cliente anônimo, não `supabaseComToken('')`: renovar é operação de quem
    // ainda NÃO tem token válido. Mandar um Bearer vazio faz o Supabase
    // recusar antes de olhar o refresh.
    const anonimo = supabaseAnonimo();
    if (!anonimo) return null;
    const { data, error } = await anonimo.auth.refreshSession({ refresh_token: atualizacao });
    if (error || !data.session) {
      limparSessao(cookies);
      return null;
    }
    gravarSessao(cookies, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    token = data.session.access_token;
    supabase = supabaseComToken(token);
    usuario = data.session.user;
  }

  if (!supabase || !usuario) {
    limparSessao(cookies);
    return null;
  }

  const { data: casa } = await supabase
    .from('venues')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (!casa) return null;

  // A prova de acesso. Vale a pena olhar para o que acontece se esta consulta
  // for burlada: nada — a RLS de `media` e `media_slots` refaz a mesma
  // pergunta no banco, em toda escrita.
  const { data: membro } = await supabase
    .from('venue_members')
    .select('papel')
    .eq('venue_id', casa.id)
    .eq('user_id', usuario.id)
    .maybeSingle();
  if (!membro) return null;

  return {
    usuarioId: usuario.id,
    email: usuario.email ?? '',
    casaId: casa.id,
    casaSlug: casa.slug,
    papel: membro.papel,
    supabase,
  };
}

/**
 * Resposta padrão de endpoint sem sessão.
 * 401 e ponto: nada de dizer se o e-mail existe, se a senha errou ou se a
 * pessoa não é da casa. Mensagem de erro detalhada em tela de login é um
 * enumerador de contas de graça.
 */
export function naoAutorizado(): Response {
  return new Response(JSON.stringify({ erro: 'Sessão expirada. Entre de novo.' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}
