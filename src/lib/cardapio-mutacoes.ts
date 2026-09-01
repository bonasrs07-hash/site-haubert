/**
 * Escritas do cardápio, feitas pelo painel. (P-001)
 *
 * Separado de `cardapio.ts` de propósito: aquele arquivo é lido no BUILD, e
 * build não escreve. Aqui é o oposto — só roda com sessão de dono.
 *
 * Todas as funções usam o cliente da SESSÃO, nunca a `service_role`: quem
 * autoriza cada linha é a RLS (`e_membro_da_casa`), que já existe no schema
 * desde o começo. O `venue_id` vai explícito em toda escrita porque a policy o
 * exige — e porque esquecê-lo num produto multi-tenant é como se escreve na
 * casa do vizinho. (ADR-002, docs/11_SEGURANCA)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerPreco } from './cardapio';

export type Tabela = 'menu_sections' | 'menu_items';
export type Resultado = { ok: true } | { ok: false; erro: string; status: number };

const naoDeu = (erro: string, status = 400): Resultado => ({ ok: false, erro, status });

/** Texto do dono: aparado, com teto, e sem os sinais que viram tag na página. */
function texto(bruto: unknown, max: number): string {
  if (typeof bruto !== 'string') return '';
  return bruto.replace(/[<>]/g, '').trim().slice(0, max);
}

/** Próxima posição livre. Item novo entra no fim, que é onde se espera achar. */
async function proximaOrdem(
  supabase: SupabaseClient,
  tabela: Tabela,
  filtro: Record<string, string>,
): Promise<number> {
  let consulta = supabase.from(tabela).select('ordem').order('ordem', { ascending: false }).limit(1);
  for (const [coluna, valor] of Object.entries(filtro)) consulta = consulta.eq(coluna, valor);
  const { data } = await consulta;
  return data && data.length ? (data[0].ordem ?? 0) + 1 : 0;
}

export async function criarSecao(
  supabase: SupabaseClient,
  casaId: string,
  entrada: { nome: unknown; descricao: unknown },
): Promise<Resultado> {
  const nome = texto(entrada.nome, 60);
  if (nome.length < 2) return naoDeu('Dê um nome à seção.');

  const { error } = await supabase.from('menu_sections').insert({
    venue_id: casaId,
    nome,
    descricao: texto(entrada.descricao, 200),
    ordem: await proximaOrdem(supabase, 'menu_sections', { venue_id: casaId }),
    publicado: false,
  });
  return error ? naoDeu('Não deu para criar a seção.', 502) : { ok: true };
}

export async function editarSecao(
  supabase: SupabaseClient,
  casaId: string,
  entrada: { id: unknown; nome: unknown; descricao: unknown; publicado: unknown },
): Promise<Resultado> {
  if (typeof entrada.id !== 'string') return naoDeu('Seção inválida.');
  const nome = texto(entrada.nome, 60);
  if (nome.length < 2) return naoDeu('Dê um nome à seção.');

  const { error } = await supabase
    .from('menu_sections')
    .update({
      nome,
      descricao: texto(entrada.descricao, 200),
      publicado: entrada.publicado === true,
    })
    .eq('venue_id', casaId)
    .eq('id', entrada.id);
  return error ? naoDeu('Não deu para salvar a seção.', 502) : { ok: true };
}

/**
 * `menu_items` tem ON DELETE CASCADE para a seção, então apagar a seção leva
 * os itens junto. É por isso que a confirmação na tela diz quantos vão com ela.
 */
export async function apagarSecao(
  supabase: SupabaseClient,
  casaId: string,
  id: unknown,
): Promise<Resultado> {
  if (typeof id !== 'string') return naoDeu('Seção inválida.');
  const { error } = await supabase
    .from('menu_sections')
    .delete()
    .eq('venue_id', casaId)
    .eq('id', id);
  return error ? naoDeu('Não deu para apagar a seção.', 502) : { ok: true };
}

export async function criarItem(
  supabase: SupabaseClient,
  casaId: string,
  entrada: { secaoId: unknown; nome: unknown; descricao: unknown; preco: unknown },
): Promise<Resultado> {
  if (typeof entrada.secaoId !== 'string') return naoDeu('Seção inválida.');
  const nome = texto(entrada.nome, 60);
  if (nome.length < 2) return naoDeu('Dê um nome ao item.');

  const preco = lerPreco(typeof entrada.preco === 'string' ? entrada.preco : '');
  if (preco === undefined) return naoDeu('Preço não entendido. Escreva 89 ou 89,90.');

  const { error } = await supabase.from('menu_items').insert({
    venue_id: casaId,
    section_id: entrada.secaoId,
    nome,
    descricao: texto(entrada.descricao, 240),
    preco_cents: preco,
    ordem: await proximaOrdem(supabase, 'menu_items', { section_id: entrada.secaoId }),
    publicado: false,
  });
  return error ? naoDeu('Não deu para criar o item.', 502) : { ok: true };
}

export async function editarItem(
  supabase: SupabaseClient,
  casaId: string,
  entrada: { id: unknown; nome: unknown; descricao: unknown; preco: unknown; publicado: unknown },
): Promise<Resultado> {
  if (typeof entrada.id !== 'string') return naoDeu('Item inválido.');
  const nome = texto(entrada.nome, 60);
  if (nome.length < 2) return naoDeu('Dê um nome ao item.');

  const preco = lerPreco(typeof entrada.preco === 'string' ? entrada.preco : '');
  if (preco === undefined) return naoDeu('Preço não entendido. Escreva 89 ou 89,90.');

  const { error } = await supabase
    .from('menu_items')
    .update({
      nome,
      descricao: texto(entrada.descricao, 240),
      preco_cents: preco,
      publicado: entrada.publicado === true,
    })
    .eq('venue_id', casaId)
    .eq('id', entrada.id);
  return error ? naoDeu('Não deu para salvar o item.', 502) : { ok: true };
}

export async function apagarItem(
  supabase: SupabaseClient,
  casaId: string,
  id: unknown,
): Promise<Resultado> {
  if (typeof id !== 'string') return naoDeu('Item inválido.');
  const { error } = await supabase.from('menu_items').delete().eq('venue_id', casaId).eq('id', id);
  return error ? naoDeu('Não deu para apagar o item.', 502) : { ok: true };
}

/**
 * Troca de lugar com o vizinho.
 *
 * Num cardápio a ordem é conteúdo, não preferência: entrada antes de sobremesa
 * é como se lê comida. Por isso reordenar não é enfeite de painel.
 */
export async function mover(
  supabase: SupabaseClient,
  casaId: string,
  tabela: Tabela,
  id: unknown,
  direcao: unknown,
): Promise<Resultado> {
  if (typeof id !== 'string') return naoDeu('Item inválido.');
  if (direcao !== 'cima' && direcao !== 'baixo') return naoDeu('Direção inválida.');

  const chaveDoGrupo = tabela === 'menu_items' ? 'section_id' : 'venue_id';

  const { data: alvo } = await supabase
    .from(tabela)
    .select('id, ordem, ' + chaveDoGrupo)
    .eq('venue_id', casaId)
    .eq('id', id)
    .maybeSingle();
  if (!alvo) return naoDeu('Não encontrado.', 404);

  const grupo = (alvo as unknown as Record<string, string>)[chaveDoGrupo];
  const { data: irmaos } = await supabase
    .from(tabela)
    .select('id, ordem')
    .eq('venue_id', casaId)
    .eq(chaveDoGrupo, grupo)
    .order('ordem');
  if (!irmaos) return naoDeu('Não deu para reordenar.', 502);

  const posicao = irmaos.findIndex((x) => x.id === id);
  const destino = direcao === 'cima' ? posicao - 1 : posicao + 1;
  if (destino < 0 || destino >= irmaos.length) return { ok: true }; // já é a ponta

  // Reescreve a ordem inteira do grupo em vez de trocar dois valores: é mais
  // barato de raciocinar, e conserta de quebra qualquer empate herdado.
  const nova = [...irmaos];
  [nova[posicao], nova[destino]] = [nova[destino], nova[posicao]];
  for (let i = 0; i < nova.length; i++) {
    const { error } = await supabase
      .from(tabela)
      .update({ ordem: i })
      .eq('venue_id', casaId)
      .eq('id', nova[i].id);
    if (error) return naoDeu('Não deu para reordenar.', 502);
  }
  return { ok: true };
}
