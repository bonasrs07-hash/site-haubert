/**
 * Escritas da agenda, feitas pelo painel. (P-001)
 *
 * Separado de `agenda.ts` pelo mesmo motivo do cardápio: aquele é lido no
 * BUILD, e build não escreve. Aqui só roda com sessão de dono, e quem autoriza
 * cada linha é a RLS.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { comFusoDaCasa, gerarSlug } from './agenda';

export type Resultado = { ok: true } | { ok: false; erro: string; status: number };
const naoDeu = (erro: string, status = 400): Resultado => ({ ok: false, erro, status });

function texto(bruto: unknown, max: number): string {
  if (typeof bruto !== 'string') return '';
  return bruto.replace(/[<>]/g, '').trim().slice(0, max);
}

/** 'JORDECUTS, KAIANE ALMEIDA' vira ['JORDECUTS', 'KAIANE ALMEIDA']. */
function lerLineup(bruto: unknown): string[] {
  if (Array.isArray(bruto)) return bruto.map((x) => texto(x, 60)).filter(Boolean).slice(0, 12);
  if (typeof bruto !== 'string') return [];
  return bruto
    .split(/[,\n]/)
    .map((x) => texto(x, 60))
    .filter(Boolean)
    .slice(0, 12);
}

interface Entrada {
  titulo: unknown;
  descricao: unknown;
  inicio: unknown;
  fim: unknown;
  lineup: unknown;
  marcaSlug: unknown;
  publicado: unknown;
}

async function idDaMarca(
  supabase: SupabaseClient,
  casaId: string,
  slug: unknown,
): Promise<string | null> {
  if (typeof slug !== 'string' || !slug) return null;
  const { data } = await supabase
    .from('brands')
    .select('id')
    .eq('venue_id', casaId)
    .eq('slug', slug)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Valida e normaliza o que a tela mandou.
 * O `check` do banco já exige `fim_em > inicio_em`, mas erro de constraint
 * chega cru na tela do dono. Melhor barrar aqui, em português.
 */
async function preparar(
  supabase: SupabaseClient,
  casaId: string,
  e: Entrada,
): Promise<{ ok: true; valor: Record<string, unknown> } | { ok: false; erro: string }> {
  const titulo = texto(e.titulo, 80);
  if (titulo.length < 2) return { ok: false, erro: 'Dê um nome ao evento.' };

  const inicio = comFusoDaCasa(typeof e.inicio === 'string' ? e.inicio : '');
  if (!inicio) return { ok: false, erro: 'Escolha o dia e a hora de início.' };

  let fim: string | null = null;
  if (typeof e.fim === 'string' && e.fim) {
    fim = comFusoDaCasa(e.fim);
    if (!fim) return { ok: false, erro: 'Hora de término inválida.' };
    if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
      return { ok: false, erro: 'O término tem que ser depois do início.' };
    }
  }

  return {
    ok: true,
    valor: {
      titulo,
      descricao: texto(e.descricao, 400) || null,
      inicio_em: inicio,
      fim_em: fim,
      lineup: lerLineup(e.lineup),
      brand_id: await idDaMarca(supabase, casaId, e.marcaSlug),
      publicado: e.publicado === true,
    },
  };
}

export async function criarEvento(
  supabase: SupabaseClient,
  casaId: string,
  e: Entrada,
): Promise<Resultado> {
  const pronto = await preparar(supabase, casaId, e);
  if (!pronto.ok) return naoDeu(pronto.erro);

  const base = gerarSlug(String(pronto.valor.titulo));
  if (!base) return naoDeu('O nome do evento não gera um endereço válido.');

  // `unique (venue_id, slug)` no schema: dois "Resenha" no mesmo ano brigariam
  // pela mesma URL. O sufixo resolve sem pedir nada ao dono.
  let slug = base;
  for (let tentativa = 2; tentativa <= 20; tentativa++) {
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('venue_id', casaId)
      .eq('slug', slug)
      .maybeSingle();
    if (!data) break;
    slug = `${base}-${tentativa}`;
  }

  const { error } = await supabase
    .from('events')
    .insert({ venue_id: casaId, slug, ...pronto.valor });
  return error ? naoDeu('Não deu para criar o evento.', 502) : { ok: true };
}

export async function editarEvento(
  supabase: SupabaseClient,
  casaId: string,
  id: unknown,
  e: Entrada,
): Promise<Resultado> {
  if (typeof id !== 'string') return naoDeu('Evento inválido.');
  const pronto = await preparar(supabase, casaId, e);
  if (!pronto.ok) return naoDeu(pronto.erro);

  // O slug NÃO muda ao editar: ele já pode ter sido compartilhado, e link que
  // morre porque alguém corrigiu uma vírgula no título é um jeito caro de
  // arrumar texto.
  const { error } = await supabase
    .from('events')
    .update(pronto.valor)
    .eq('venue_id', casaId)
    .eq('id', id);
  return error ? naoDeu('Não deu para salvar o evento.', 502) : { ok: true };
}

export async function apagarEvento(
  supabase: SupabaseClient,
  casaId: string,
  id: unknown,
): Promise<Resultado> {
  if (typeof id !== 'string') return naoDeu('Evento inválido.');
  const { error } = await supabase.from('events').delete().eq('venue_id', casaId).eq('id', id);
  return error ? naoDeu('Não deu para apagar o evento.', 502) : { ok: true };
}
