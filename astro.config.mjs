// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
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

  // O React entra AQUI e serve exatamente uma rota: o painel do dono, onde
  // envio com progresso, galeria e pré-visualização são estado real — o caso
  // que o ADR-006 previu como exceção legítima. O Astro só embarca o JS da
  // ilha nas páginas que a usam, então as páginas públicas continuam com os
  // mesmos ~7 KB de <details> e radios. Isso é medido, não presumido:
  // `npm run orcamento:js`. (ADR-006, ADR-008)
  integrations: [
    react(),
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

    // O painel guarda as fotos no Storage do Supabase, e é o BUILD que as
    // baixa e otimiza — o site publicado serve `/_astro/*.webp` e nunca aponta
    // para lá. Sem esta autorização o Astro se recusa a tocar em imagem
    // remota, e com razão: otimizar o que vem de qualquer host é um jeito de
    // virar CDN de estranho. (ADR-008)
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
