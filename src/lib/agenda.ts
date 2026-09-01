/**
 * Camada de serviços, agenda. (P-001)
 *
 * Responde ao problema nº4 da `docs/00_VISAO`: "quem quer saber o line-up do
 * sábado depende de story que expira em 24h".
 *
 * Mesma arquitetura das fotos e do cardápio (ADR-008): o dono edita no painel,
 * o BUILD lê e as páginas saem estáticas. Agenda que consulta banco a cada
 * visita paga latência todo dia por um dado que muda uma vez por semana.
 *
 * Por que só agora: BLK-007 adiou datas no site com um argumento específico,
 * "data errada no site queima mais confiança do que a ausência dela". O painel
 * é o processo que faltava. O argumento caiu, não foi ignorado.
 *
 * O piso é `EVENTOS` de `constants/casa.ts`, que descreve os encontros por
 * CADÊNCIA e sem data — que é exatamente o que `/cultura` mostra hoje. Sem
 * evento datado no banco, a agenda diz isso em voz alta em vez de ficar vazia.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServidor } from './supabase';

export interface EventoDatado {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  /** ISO. O fuso da casa é America/Sao_Paulo; quem formata é a tela. */
  inicioEm: string;
  fimEm: string | null;
  lineup: string[];
  marcaSlug: string | null;
  publicado: boolean;
}

interface Linha {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  inicio_em: string;
  fim_em: string | null;
  lineup: string[] | null;
  brand_id: string | null;
  publicado: boolean;
}

function montar(l: Linha, marcaPorId: Map<string, string>): EventoDatado {
  return {
    id: l.id,
    slug: l.slug,
    titulo: l.titulo,
    descricao: l.descricao ?? '',
    inicioEm: l.inicio_em,
    fimEm: l.fim_em,
    lineup: l.lineup ?? [],
    marcaSlug: l.brand_id ? (marcaPorId.get(l.brand_id) ?? null) : null,
    publicado: l.publicado,
  };
}

const CAMPOS = 'id, slug, titulo, descricao, inicio_em, fim_em, lineup, brand_id, publicado';

/**
 * Os eventos publicados, lidos no BUILD com a `service_role`.
 *
 * Traz também os que já passaram: a página de cada um continua existindo para
 * que link compartilhado não morra. Quem decide o que LISTAR é `daquiPraFrente`.
 */
let doBuild: Promise<EventoDatado[]> | null = null;

export function buscarEventosPublicados(): Promise<EventoDatado[]> {
  doBuild ??= (async () => {
    const slug = import.meta.env.PUBLIC_VENUE_SLUG;
    if (!slug) return [];
    try {
      const supabase = supabaseServidor();
      const { data: casa } = await supabase
        .from('venues')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!casa) return [];

      const { data: marcas } = await supabase
        .from('brands')
        .select('id, slug')
        .eq('venue_id', casa.id);
      const marcaPorId = new Map((marcas ?? []).map((m) => [m.id as string, m.slug as string]));

      const { data } = await supabase
        .from('events')
        .select(CAMPOS)
        .eq('venue_id', casa.id)
        .eq('publicado', true)
        .order('inicio_em');

      return (data ?? []).map((l) => montar(l as Linha, marcaPorId));
    } catch {
      // O site nunca deixa de compilar por causa do banco. (F-006)
      return [];
    }
  })();
  return doBuild;
}

/**
 * Só o que ainda vai acontecer.
 *
 * Agenda desatualizada é pior que agenda nenhuma: ela ensina o visitante a não
 * confiar na página. O corte é automático justamente para não depender de
 * alguém lembrar de apagar.
 *
 * A margem de 6 horas existe porque um evento que começou às 22h ainda está
 * acontecendo à meia-noite, e sumir da agenda no meio da festa é errado.
 */
export function daquiPraFrente(eventos: EventoDatado[], agora: Date = new Date()): EventoDatado[] {
  const corte = agora.getTime() - 6 * 60 * 60 * 1000;
  return eventos
    .filter((e) => {
      const fim = e.fimEm ? new Date(e.fimEm).getTime() : new Date(e.inicioEm).getTime();
      return fim >= corte;
    })
    .sort((a, b) => new Date(a.inicioEm).getTime() - new Date(b.inicioEm).getTime());
}

/** Tudo, publicado ou não, para o painel. Lê com o token do dono: RLS decide. */
export async function listarAgenda(
  supabase: SupabaseClient,
  casaId: string,
): Promise<EventoDatado[]> {
  const { data: marcas } = await supabase.from('brands').select('id, slug').eq('venue_id', casaId);
  const marcaPorId = new Map((marcas ?? []).map((m) => [m.id as string, m.slug as string]));

  const { data } = await supabase
    .from('events')
    .select(CAMPOS)
    .eq('venue_id', casaId)
    .order('inicio_em', { ascending: false });

  return (data ?? []).map((l) => montar(l as Linha, marcaPorId));
}

/**
 * Slug a partir do título. Sem acento, sem espaço, sem surpresa na URL.
 * Função pura, testada.
 */
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * `datetime-local` do browser não tem fuso: ele entrega '2026-09-12T21:00'.
 * Interpretar isso como UTC atrasaria todo evento em 3 horas, e o site diria
 * 18h para uma festa que começa às 21h.
 */
export function comFusoDaCasa(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  // -03:00 é o horário de Brasília, e o Brasil não usa mais horário de verão.
  const d = new Date(`${local}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** O caminho de volta: ISO vira o valor que o `datetime-local` entende. */
export function paraCampoLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const naCasa = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return naCasa.toISOString().slice(0, 16);
}
