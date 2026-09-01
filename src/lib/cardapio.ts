/**
 * Camada de serviços, cardápio. (P-001)
 *
 * Mesma arquitetura das fotos (ADR-008), pelo mesmo motivo: o dono edita no
 * painel, o BUILD lê e a página sai estática. `/cardapio` não consulta o banco
 * em runtime, e por isso não tem custo por visita nem depende de o Supabase
 * estar de pé para carregar.
 *
 * Por que o cardápio pôde sair agora: BLK-004 e RN-21 adiaram preço no site
 * com um argumento específico, "preço sem processo para atualizá-lo vira preço
 * errado em três meses". O painel É esse processo. O argumento caiu, não foi
 * ignorado.
 *
 * O piso segue a mesma regra do resto: banco vazio ou fora do ar cai nos seis
 * cortes que já vivem em `constants/casa.ts`, sem preço, como o site mostra
 * hoje. A página nunca fica em branco.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { CORTES } from '@/constants/casa';
import { supabaseServidor } from './supabase';

export interface ItemDoCardapio {
  id: string;
  nome: string;
  descricao: string;
  /** Centavos, inteiro. Nunca float para dinheiro. `null` = preço não divulgado. */
  precoCents: number | null;
  publicado: boolean;
  ordem: number;
}

export interface SecaoDoCardapio {
  id: string;
  nome: string;
  descricao: string;
  publicado: boolean;
  ordem: number;
  itens: ItemDoCardapio[];
}

/** Preço em centavos vira texto em real. Formatação nunca inventa centavo. */
export function formatarPreco(cents: number | null): string | null {
  if (cents === null || !Number.isFinite(cents)) return null;
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Texto do dono vira centavos.
 *
 * O ponto é ambíguo e a ambiguidade é real: em português ele é separador de
 * milhar ("1.299,90"), mas quem digita rápido usa ponto como decimal
 * ("89.90"). Chutar um dos dois erra o preço por um fator de 100, que é o
 * tipo de erro que chega na conta do cliente. A regra abaixo desempata:
 *
 *   - tem vírgula  -> a vírgula é o decimal, e todo ponto é milhar
 *   - só ponto, com 3 dígitos depois -> milhar ("1.299" = mil duzentos e noventa e nove)
 *   - só ponto, com 1 ou 2 dígitos depois -> decimal ("89.90" = oitenta e nove e noventa)
 *
 * Devolve `null` para vazio (preço não divulgado) e `undefined` para lixo,
 * que é diferente: um some da tela, o outro vira mensagem de erro.
 */
export function lerPreco(bruto: string): number | null | undefined {
  const limpo = bruto.trim();
  if (!limpo) return null;

  let so = limpo.replace(/[R$\s ]/g, '');
  if (!/^[\d.,]+$/.test(so)) return undefined;

  if (so.includes(',')) {
    so = so.replace(/\./g, '').replace(',', '.');
  } else {
    const partes = so.split('.');
    if (partes.length > 2) so = partes.join('');
    else if (partes.length === 2) so = partes[1].length === 3 ? partes.join('') : partes.join('.');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(so)) return undefined;
  const cents = Math.round(Number(so) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : undefined;
}

/** O piso: os seis cortes do guia, sem preço, numa seção só. (ADR-007) */
function cardapioPadrao(): SecaoDoCardapio[] {
  return [
    {
      id: 'padrao-cortes',
      nome: 'Os cortes',
      descricao: 'Seis cortes, um método. Os valores do dia a equipe passa na conversa.',
      publicado: true,
      ordem: 0,
      itens: CORTES.map((c, i) => ({
        id: `padrao-${i}`,
        nome: c.nome,
        descricao: c.descricao,
        precoCents: null,
        publicado: true,
        ordem: i,
      })),
    },
  ];
}

interface LinhaSecao {
  id: string;
  nome: string;
  descricao: string | null;
  publicado: boolean;
  ordem: number;
}
interface LinhaItem {
  id: string;
  section_id: string;
  nome: string;
  descricao: string | null;
  preco_cents: number | null;
  publicado: boolean;
  ordem: number;
}

function montar(secoes: LinhaSecao[], itens: LinhaItem[]): SecaoDoCardapio[] {
  const porSecao = new Map<string, ItemDoCardapio[]>();
  for (const i of itens) {
    const lista = porSecao.get(i.section_id) ?? [];
    lista.push({
      id: i.id,
      nome: i.nome,
      descricao: i.descricao ?? '',
      precoCents: i.preco_cents,
      publicado: i.publicado,
      ordem: i.ordem,
    });
    porSecao.set(i.section_id, lista);
  }
  return secoes.map((s) => ({
    id: s.id,
    nome: s.nome,
    descricao: s.descricao ?? '',
    publicado: s.publicado,
    ordem: s.ordem,
    itens: (porSecao.get(s.id) ?? []).sort((a, b) => a.ordem - b.ordem),
  }));
}

/**
 * O cardápio que vai para o site, lido no BUILD com a service_role.
 * Só o que está publicado. Falhou qualquer coisa: devolve o piso.
 */
let doBuild: Promise<SecaoDoCardapio[]> | null = null;

export function buscarCardapioPublicado(): Promise<SecaoDoCardapio[]> {
  doBuild ??= (async () => {
    const slug = import.meta.env.PUBLIC_VENUE_SLUG;
    if (!slug) return cardapioPadrao();
    try {
      const supabase = supabaseServidor();
      const { data: casa } = await supabase
        .from('venues')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!casa) return cardapioPadrao();

      const { data: secoes } = await supabase
        .from('menu_sections')
        .select('id, nome, descricao, publicado, ordem')
        .eq('venue_id', casa.id)
        .eq('publicado', true)
        .order('ordem');
      if (!secoes || secoes.length === 0) return cardapioPadrao();

      const { data: itens } = await supabase
        .from('menu_items')
        .select('id, section_id, nome, descricao, preco_cents, publicado, ordem')
        .eq('venue_id', casa.id)
        .eq('publicado', true)
        .order('ordem');

      const montado = montar(secoes as LinhaSecao[], (itens ?? []) as LinhaItem[]).filter(
        (s) => s.itens.length > 0,
      );
      return montado.length ? montado : cardapioPadrao();
    } catch {
      return cardapioPadrao();
    }
  })();
  return doBuild;
}

/** É o piso, ou já é o cardápio do dono? A página avisa quando é o piso. */
export function ehPadrao(secoes: SecaoDoCardapio[]): boolean {
  return secoes.length === 1 && secoes[0].id === 'padrao-cortes';
}

/** Tudo, publicado ou não, para o painel. Lê com o token do dono: RLS decide. */
export async function listarCardapio(
  supabase: SupabaseClient,
  casaId: string,
): Promise<SecaoDoCardapio[]> {
  const { data: secoes } = await supabase
    .from('menu_sections')
    .select('id, nome, descricao, publicado, ordem')
    .eq('venue_id', casaId)
    .order('ordem');
  if (!secoes) return [];

  const { data: itens } = await supabase
    .from('menu_items')
    .select('id, section_id, nome, descricao, preco_cents, publicado, ordem')
    .eq('venue_id', casaId)
    .order('ordem');

  return montar(secoes as LinhaSecao[], (itens ?? []) as LinhaItem[]);
}
