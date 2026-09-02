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

  // A tela de entrar é a única do painel que existe para quem NÃO tem sessão,
  // e é onde a senha é digitada. Ela precisa da blindagem MAIS que as outras:
  // `form-action 'self'` é o que impede um formulário injetado de postar a senha
  // do dono em outro servidor. Ela ficava de fora porque saía por um `return`
  // antecipado, o que só apareceu quando os cabeçalhos foram medidos.
  if (ABERTAS.has(rota)) return blindar(await proximo());

  const sessao = await lerSessao(contexto.cookies);

  if (!sessao) {
    // Endpoint responde 401; página manda para a tela de entrar. A distinção
    // importa: a ilha React precisa saber que a sessão caiu, e não receber um
    // HTML de login dentro de um `fetch`.
    if (rota.startsWith('/api/')) {
      return blindar(
        new Response(JSON.stringify({ erro: 'Sessão expirada. Entre de novo.' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }
    return blindar(contexto.redirect('/painel/entrar', 302));
  }

  // A sessão viaja para a página e para o endpoint já pronta, ninguém repete
  // a validação, e ninguém esquece de fazê-la.
  contexto.locals.sessao = sessao;

  return blindar(await proximo());
});

/**
 * Toda resposta do painel sai por aqui, inclusive o 401, o redirecionamento e
 * a tela de entrar. Uma saída que escapa da blindagem é uma porta destrancada
 * que ninguém sabe que existe, então não existe `return` de painel que não
 * passe por esta função.
 */
function blindar(resposta: Response): Response {
  // Painel não é conteúdo público: nada de cache em CDN, nada de índice.
  resposta.headers.set('cache-control', 'no-store, must-revalidate');
  resposta.headers.set('x-robots-tag', 'noindex, nofollow');
  resposta.headers.set('content-security-policy', CSP_DO_PAINEL);
  return resposta;
}

/**
 * A CSP do painel. O site público tem a dele, estrita e por hash, gerada no
 * build para o `vercel.json`, e o `vercel.json` exclui estas rotas de
 * propósito. Duas políticas na mesma resposta valem pela INTERSEÇÃO, então
 * deixar a do site alcançar o painel mataria a hidratação do React.
 *
 * Aqui `script-src` precisa de `'unsafe-inline'`, e vale dizer por quê em vez de
 * fingir que é rigor: o painel é SSR com ilha React, e a hidratação injeta
 * script embutido na hora do pedido. Hash exige conhecer o conteúdo no build, o
 * que aqui não existe.
 *
 * O que sobra ainda vale a pena, e é o oposto de decorativo:
 *   - `default-src 'self'` corta qualquer origem de fora;
 *   - `frame-ancestors 'none'` impede clickjacking, e o painel é onde se
 *     apaga foto e se publica o site;
 *   - `form-action 'self'` impede que um formulário injetado poste a senha do
 *     dono em outro servidor;
 *   - `base-uri 'self'` fecha o truque de reescrever a base e sequestrar todo
 *     caminho relativo da página.
 *
 * `img-src` abre para o Storage do Supabase porque a galeria mostra a foto por
 * URL assinada, direto do bucket privado (`lib/midia.ts`), e `blob:` porque a
 * pré-visualização do envio é feita no browser antes de subir.
 */
const CSP_DO_PAINEL = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "frame-src 'none'",
].join('; ');
