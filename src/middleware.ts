/**
 * Guarda do painel. (docs/11_SEGURANCA, "Auth antes de renderizar")
 *
 * A verificação acontece AQUI, no servidor, antes de qualquer HTML sair. Não
 * existe versão desta checagem no cliente: esconder o botão não é proteger a
 * rota, e um painel que se protege com `if` de JavaScript está aberto para
 * quem sabe apertar F12.
 *
 * Isto é a segunda de três barreiras, e nenhuma delas confia nas outras:
 *   1. o cookie é validado contra o servidor de Auth (`lerSessao`);
 *   2. esta guarda decide se a rota sequer renderiza;
 *   3. a RLS decide, no banco, se cada linha pode ser lida ou escrita.
 * Furar as duas primeiras não dá acesso a dado nenhum, é de propósito.
 */
import { defineMiddleware } from 'astro:middleware';
import { lerSessao } from '@/lib/sessao';

/** As duas rotas do painel que existem justamente para quem NÃO tem sessão. */
const ABERTAS = new Set(['/painel/entrar', '/api/painel/entrar', '/api/painel/sair']);

export const onRequest = defineMiddleware(async (contexto, proximo) => {
  const rota = contexto.url.pathname.replace(/\/+$/, '') || '/';

  // O site público não passa por nada disto. Também é o que mantém o build das
  // páginas estáticas sem uma ida ao banco por página.
  if (!rota.startsWith('/painel') && !rota.startsWith('/api/painel')) return proximo();
  if (ABERTAS.has(rota)) return proximo();

  const sessao = await lerSessao(contexto.cookies);

  if (!sessao) {
    // Endpoint responde 401; página manda para a tela de entrar. A distinção
    // importa: a ilha React precisa saber que a sessão caiu, e não receber um
    // HTML de login dentro de um `fetch`.
    if (rota.startsWith('/api/')) {
      return new Response(JSON.stringify({ erro: 'Sessão expirada. Entre de novo.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return contexto.redirect('/painel/entrar', 302);
  }

  // A sessão viaja para a página e para o endpoint já pronta, ninguém repete
  // a validação, e ninguém esquece de fazê-la.
  contexto.locals.sessao = sessao;

  const resposta = await proximo();

  // Painel não é conteúdo público: nada de cache em CDN, nada de índice.
  resposta.headers.set('cache-control', 'no-store, must-revalidate');
  resposta.headers.set('x-robots-tag', 'noindex, nofollow');
  return resposta;
});
