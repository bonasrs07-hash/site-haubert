// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Astro 7 tem apenas 'static' | 'server'. O modo antigamente chamado 'hybrid'
// virou 'static' + adapter: as páginas nascem pré-renderizadas e cada rota
// dinâmica opta por SSR com `export const prerender = false`. (ADR-001)
/**
 * A URL canônica do deploy.
 *
 * Isto não é detalhe de configuração: `site` alimenta a canônica, o sitemap e o
 * `og:image` — que precisa ser absoluto porque quem lê é o WhatsApp, não o
 * browser. Apontar para um domínio que ainda não existe (BLK-006) entrega card
 * de compartilhamento quebrado justamente no canal onde esta casa vive.
 *
 * A ordem resolve isso sem depender de ninguém lembrar de configurar:
 *   1. `PUBLIC_SITE_URL` — a decisão explícita sempre ganha; é o que vai
 *      apontar para o domínio próprio quando ele existir.
 *   2. Domínio de produção da Vercel, em build de produção.
 *   3. URL do deploy (preview de branch).
 *   4. localhost — build local não é publicado, e canônica de localhost é uma
 *      falha barulhenta. Domínio morto é uma falha silenciosa, que é pior.
 */
const naVercel = (v) => (v ? `https://${v}` : null);
const urlDoSite =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === 'production'
    ? naVercel(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : null) ||
  naVercel(process.env.VERCEL_URL) ||
  'http://localhost:4321';

export default defineConfig({
  site: urlDoSite,
  output: 'static',
  adapter: vercel({ webAnalytics: { enabled: true } }),

  // A Fase 1 fecha com ZERO React no cliente: alternador de modo e reserva são
  // <details> + radios + ~1kb de script. `@astrojs/react` continua no
  // package.json porque a reserva nativa da Fase 3 (formulário, validação,
  // estados de envio) é o caso em que a ilha se paga — aí a integração volta
  // para esta lista. Integração registrada sem uso só atrasa build. (P-002)
  integrations: [
    sitemap({
      // /privacidade e /404 saem do índice: uma é ruído de busca, a outra não
      // deveria ser encontrada por ninguém.
      filter: (pagina) => !pagina.includes('/privacidade') && !pagina.includes('/404'),
      i18n: undefined,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  image: {
    // Foto é 90% do peso deste site e o público está em 4G. (docs/01_ARQUITETURA)
    responsiveStyles: true,
    layout: 'constrained',
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
