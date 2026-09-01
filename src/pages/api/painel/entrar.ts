/**
 * Entrada no painel. (ADR-008)
 *
 * Formulário HTML de verdade, com redirecionamento — não `fetch`. A tela de
 * login é a única do painel que funciona sem JavaScript, e isso é de propósito:
 * é a porta, e porta que depende de script é porta que trava.
 *
 * O que esta rota NUNCA faz:
 *   - dizer se o e-mail existe ("senha errada" e "conta inexistente" dão a
 *     mesma resposta; a diferença seria um enumerador de contas de graça);
 *   - registrar e-mail ou senha em log (docs/11_SEGURANCA).
 *
 * Não existe rota de cadastro, de convite nem de recuperação. O cadastro
 * público fica DESLIGADO no console do Supabase — sem isso, qualquer pessoa
 * cria uma conta. O passo está no INSTALACAO.md porque é console, não código.
 */
import type { APIRoute } from 'astro';
import { supabaseAnonimo } from '@/lib/supabase';
import { gravarSessao } from '@/lib/sessao';
import { registrarTentativa } from '@/lib/freio';

export const prerender = false;

const voltarComErro = (url: URL, motivo: string) =>
  new Response(null, {
    status: 302,
    headers: { location: `/painel/entrar?erro=${encodeURIComponent(motivo)}` },
  });

export const POST: APIRoute = async ({ request, cookies, url, clientAddress }) => {
  const formulario = await request.formData();
  const email = String(formulario.get('email') ?? '').trim();
  const senha = String(formulario.get('senha') ?? '');

  if (!email || !senha) return voltarComErro(url, 'Preencha e-mail e senha.');

  const freio = registrarTentativa(clientAddress ?? 'desconhecido');
  if (!freio.permitido) {
    return voltarComErro(url, `Tentativas demais. Espere ${freio.segundos}s.`);
  }

  const supabase = supabaseAnonimo();
  if (!supabase) return voltarComErro(url, 'O painel ainda não está configurado.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  // Uma mensagem só para qualquer motivo de recusa.
  if (error || !data.session) return voltarComErro(url, 'E-mail ou senha não conferem.');

  gravarSessao(cookies, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return new Response(null, { status: 302, headers: { location: '/painel' } });
};
