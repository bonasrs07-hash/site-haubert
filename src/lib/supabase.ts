/**
 * Clientes Supabase.
 *
 * A Fase 1 não consulta o banco — o conteúdo vem de `src/constants/casa.ts`.
 * Este arquivo existe para que a Fase 2 troque a origem do dado dentro da
 * camada de serviços, sem que nenhum componente saiba. (P-001, ADR-001)
 *
 * FRONTEIRA DE SEGURANÇA (docs/11_SEGURANCA):
 *   - `anon`         → pode ir ao browser. Quem protege o dado é a RLS.
 *   - `service_role` → NUNCA sai do servidor. Nem em ilha React, nem em
 *                      variável PUBLIC_*, nem em log.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const chaveAnon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

let clientePublico: SupabaseClient | null = null;

/**
 * Cliente público (chave `anon`). Toda a proteção vem das policies de RLS.
 * Devolve `null` quando o ambiente não está configurado — o site tem que
 * continuar servindo o conteúdo estático mesmo sem banco. (F-006)
 */
export function supabasePublico(): SupabaseClient | null {
  if (!url || !chaveAnon) return null;
  clientePublico ??= createClient(url, chaveAnon, {
    auth: { persistSession: false },
  });
  return clientePublico;
}

/**
 * Cliente de servidor (`service_role`). Ignora RLS — use apenas em endpoint
 * Astro ou Edge Function, e só quando a operação realmente exigir.
 *
 * Lança se for chamado no browser: é a última barreira contra o vazamento mais
 * caro desta stack.
 */
export function supabaseServidor(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      'supabaseServidor() foi chamado no browser. A service_role nunca sai do servidor.',
    );
  }
  const chaveServico = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chaveServico) {
    throw new Error('Supabase de servidor não configurado (URL ou SUPABASE_SERVICE_ROLE_KEY).');
  }
  return createClient(url, chaveServico, { auth: { persistSession: false } });
}
