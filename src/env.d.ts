/// <reference types="astro/client" />

import type { Sessao } from '@/lib/sessao';

declare global {
  namespace App {
    interface Locals {
      /**
       * Sessão do painel, posta pelo middleware. Presente em TODA rota sob
       * `/painel` e `/api/painel` que não seja a de entrar, se o middleware
       * deixou passar, a sessão existe e é válida. Página nenhuma revalida.
       */
      sessao: import('@/lib/sessao').Sessao;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_VENUE_SLUG: string;
  readonly PUBLIC_WHATSAPP: string;
  readonly PUBLIC_SITE_URL: string;
  /** Servidor. Só no build e em endpoint, nunca no browser. */
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  /** Servidor. O gatilho de rebuild que publica a troca de foto. (ADR-008) */
  readonly VERCEL_DEPLOY_HOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export type { Sessao };
