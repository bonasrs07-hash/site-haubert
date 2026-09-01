/**
 * Intenção de reserva: o toque no botão, com a escolha feita.
 *
 * A north star do projeto é "cliques no CTA de reserva por sessão"
 * (`docs/00_VISAO`). Até agora ela não era medida por ninguém: o CTA era um
 * `<a>` sem instrumento. Este arquivo é a metade servidor disso.
 *
 * O que NÃO existe aqui é tão importante quanto o que existe: nome, telefone,
 * e-mail. O fluxo de 3 toques não pede contato, e não pode pedir. Quem fica
 * com o contato é o WhatsApp, que é o dono legítimo dele. (ADR-005)
 *
 * As funções de código e validação são puras e nascem com teste.
 */
import { z } from 'zod';
import { supabaseServidor } from './supabase';
import { FORMATO_CODIGO, MAX_PESSOAS, MIN_PESSOAS } from './reservas';

/**
 * O que o browser tem direito de mandar. Entrada pública é entrada hostil:
 * tudo aqui é limitado, e o que não bater é recusado inteiro em vez de
 * "corrigido" em silêncio. (docs/11_SEGURANCA, camada 3)
 */
export const esquemaIntencao = z.object({
  marca: z.string().min(1).max(32),
  codigo: z.string().regex(FORMATO_CODIGO),
  pessoas: z.number().int().min(MIN_PESSOAS).max(MAX_PESSOAS),
  quando: z.string().max(24).default(''),
  canal: z.enum(['whatsapp', 'telefone', 'instagram']),
  origem: z.string().min(1).max(32),
});

export type Intencao = z.infer<typeof esquemaIntencao>;

export interface IntencaoRegistrada extends Intencao {
  id: string;
  criadoEm: string;
}

/**
 * Grava a intenção. Usa `service_role` porque a tabela não tem policy de
 * INSERT para `anon` de propósito: abrir escrita pública seria entregar um
 * gerador de linhas para qualquer um com um curl.
 *
 * Devolve `false` em qualquer falha, sem detalhar. Quem chama é fogo-e-esquece
 * e não deve travar a reserva por causa de uma métrica. (CLAUDE.md)
 */
export async function registrarIntencao(intencao: Intencao): Promise<boolean> {
  const slug = import.meta.env.PUBLIC_VENUE_SLUG;
  if (!slug) return false;

  try {
    const supabase = supabaseServidor();

    const { data: casa } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!casa) return false;

    const { error } = await supabase.from('reservation_intents').insert({
      venue_id: casa.id,
      marca_slug: intencao.marca,
      codigo: intencao.codigo,
      pessoas: intencao.pessoas,
      quando: intencao.quando,
      canal: intencao.canal,
      origem: intencao.origem,
    });
    return !error;
  } catch {
    return false;
  }
}

export interface ResumoDeIntencoes {
  total: number;
  hoje: number;
  seteDias: number;
  mediaPessoas: number;
  porCanal: Record<string, number>;
  porMarca: Record<string, number>;
}

/**
 * As últimas intenções, para o painel. Lê com o token do DONO, não com a
 * service_role: quem autoriza é a RLS.
 */
export async function listarIntencoes(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  casaId: string,
  limite = 60,
): Promise<IntencaoRegistrada[]> {
  const { data, error } = await supabase
    .from('reservation_intents')
    .select('id, marca_slug, codigo, pessoas, quando, canal, origem, criado_em')
    .eq('venue_id', casaId)
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error || !data) return [];

  return data.map((i) => ({
    id: i.id,
    marca: i.marca_slug,
    codigo: i.codigo,
    pessoas: i.pessoas,
    quando: i.quando,
    canal: i.canal,
    origem: i.origem,
    criadoEm: i.criado_em,
  }));
}

/**
 * O resumo que responde à pergunta do dono: "isso está funcionando?".
 * Função pura sobre a lista, para poder ser testada sem banco.
 */
export function resumir(lista: IntencaoRegistrada[], agora = new Date()): ResumoDeIntencoes {
  const inicioDeHoje = new Date(agora);
  inicioDeHoje.setHours(0, 0, 0, 0);
  const seteDiasAtras = agora.getTime() - 7 * 24 * 60 * 60 * 1000;

  let hoje = 0;
  let seteDias = 0;
  let somaPessoas = 0;
  const porCanal: Record<string, number> = {};
  const porMarca: Record<string, number> = {};

  for (const i of lista) {
    const quando = new Date(i.criadoEm).getTime();
    if (quando >= inicioDeHoje.getTime()) hoje++;
    if (quando >= seteDiasAtras) seteDias++;
    somaPessoas += i.pessoas;
    porCanal[i.canal] = (porCanal[i.canal] ?? 0) + 1;
    porMarca[i.marca] = (porMarca[i.marca] ?? 0) + 1;
  }

  return {
    total: lista.length,
    hoje,
    seteDias,
    mediaPessoas: lista.length ? Math.round((somaPessoas / lista.length) * 10) / 10 : 0,
    porCanal,
    porMarca,
  };
}
