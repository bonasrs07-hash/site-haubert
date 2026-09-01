/**
 * Camada de serviços, o acervo de fotos do painel. (ADR-008, P-001)
 *
 * Nenhum componente e nenhum endpoint fala com o Supabase direto: falam daqui.
 * Tudo neste arquivo usa o cliente da SESSÃO (token do dono), nunca a
 * `service_role`, quem autoriza cada linha é a RLS. O único lugar do projeto
 * que lê este acervo com `service_role` é `fotos.ts`, no build, onde não existe
 * usuário logado.
 */
import type { Sessao } from './sessao';
import { montarCaminho, validarEnvio } from './upload';
import { ehChaveDeVaga } from '@/constants/vagas';

/** Vida da URL de pré-visualização no painel. Curta: é só para a tela. */
const SEGUNDOS_DE_PREVIA = 60 * 30;

/** Freio do botão Publicar, o Hobby da Vercel dá 100 deploys por dia. */
export const SEGUNDOS_ENTRE_PUBLICACOES = 60;

export interface ItemDoAcervo {
  id: string;
  nome: string;
  alt: string;
  largura: number;
  altura: number;
  bytes: number;
  autorizacaoImagem: boolean;
  criadoEm: string;
  /** URL assinada, de vida curta, só para a tela do painel. */
  previa: string | null;
  /** Em que vagas do site esta foto está agora. Vazio = só na galeria. */
  vagas: string[];
}

export interface EstadoDaVaga {
  chave: string;
  mediaId: string | null;
  atualizadoEm: string;
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string; status: number };

const falha = (erro: string, status = 400): Resultado<never> => ({ ok: false, erro, status });

/**
 * A galeria inteira, com as prévias assinadas de uma vez só.
 * Assinar em lote e não uma por item: 40 fotos seriam 40 idas ao Storage.
 */
export async function listarAcervo(sessao: Sessao): Promise<ItemDoAcervo[]> {
  const { supabase, casaId } = sessao;

  // Campos explícitos, nunca `select *`. (docs/11_SEGURANCA)
  const { data, error } = await supabase
    .from('media')
    .select('id, nome, alt, largura, altura, bytes, autorizacao_imagem, criado_em, storage_path')
    .eq('venue_id', casaId)
    .order('criado_em', { ascending: false });
  if (error || !data) return [];

  const { data: vagas } = await supabase
    .from('media_slots')
    .select('chave, media_id')
    .eq('venue_id', casaId);

  const vagasPorMidia = new Map<string, string[]>();
  for (const v of vagas ?? []) {
    const lista = vagasPorMidia.get(v.media_id) ?? [];
    lista.push(v.chave);
    vagasPorMidia.set(v.media_id, lista);
  }

  const caminhos = data.map((m) => m.storage_path);
  const previaPorCaminho = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage
      .from('midia')
      .createSignedUrls(caminhos, SEGUNDOS_DE_PREVIA);
    for (const a of assinadas ?? []) {
      if (a.signedUrl && !a.error) previaPorCaminho.set(a.path ?? '', a.signedUrl);
    }
  }

  return data.map((m) => ({
    id: m.id,
    nome: m.nome,
    alt: m.alt,
    largura: m.largura,
    altura: m.altura,
    bytes: m.bytes,
    autorizacaoImagem: m.autorizacao_imagem,
    criadoEm: m.criado_em,
    previa: previaPorCaminho.get(m.storage_path) ?? null,
    vagas: vagasPorMidia.get(m.id) ?? [],
  }));
}

/** Que foto está em cada vaga agora. Vaga ausente = o site usa o arquivo padrão. */
export async function listarVagas(sessao: Sessao): Promise<EstadoDaVaga[]> {
  const { data } = await sessao.supabase
    .from('media_slots')
    .select('chave, media_id, atualizado_em')
    .eq('venue_id', sessao.casaId);
  return (data ?? []).map((v) => ({
    chave: v.chave,
    mediaId: v.media_id,
    atualizadoEm: v.atualizado_em,
  }));
}

/**
 * Quando o site foi publicado pela última vez.
 *
 * É o que separa "troquei a foto" de "a foto está no ar", a distinção mais
 * fácil de confundir neste painel, porque a troca aparece na tela na hora e no
 * site só depois do build. Sem este carimbo, o aviso de pendência seria
 * decorativo: some ao recarregar a página e mente para quem fechou a aba no
 * meio. (ADR-008)
 */
export async function buscarUltimaPublicacao(sessao: Sessao): Promise<string | null> {
  const { data } = await sessao.supabase
    .from('venues')
    .select('ultima_publicacao_em')
    .eq('id', sessao.casaId)
    .maybeSingle();
  return data?.ultima_publicacao_em ?? null;
}

/**
 * Guarda o arquivo e registra no acervo.
 *
 * A ordem importa: valida → sobe → registra. Se o registro falhar depois do
 * upload, o arquivo órfão é apagado, bucket com arquivo que ninguém referencia
 * é cota queimada em silêncio.
 */
export async function registrarEnvio(
  sessao: Sessao,
  entrada: {
    bytes: Uint8Array;
    nome: string;
    alt: string;
    temPessoa: boolean;
    autorizacaoImagem: boolean;
  },
): Promise<Resultado<{ item: ItemDoAcervo }>> {
  const validacao = validarEnvio(entrada.bytes);
  if (!validacao.ok) return falha(validacao.erro);

  const alt = entrada.alt.trim();
  if (alt.length < 10) {
    return falha(
      'Descreva a foto em pelo menos 10 caracteres. A descrição é o que quem usa leitor de tela recebe no lugar da imagem.',
    );
  }
  if (alt.length > 300) return falha('A descrição passou de 300 caracteres.');

  // Direito de imagem (BLK-008, memory/restrictions.md, restrição ALTA).
  // A ilha já barra isto na tela, mas tela é UX; a regra tem que existir aqui,
  // onde ela não depende do JavaScript de ninguém. (docs/11_SEGURANCA)
  if (entrada.temPessoa && !entrada.autorizacaoImagem) {
    return falha(
      'Foto com pessoa identificável só entra com autorização de uso de imagem registrada.',
      422,
    );
  }

  const id = crypto.randomUUID();
  const caminho = montarCaminho(sessao.casaSlug, id, new Date());

  const { error: erroUpload } = await sessao.supabase.storage
    .from('midia')
    .upload(caminho, entrada.bytes, { contentType: 'image/webp', upsert: false });
  if (erroUpload) return falha('Não deu para guardar a imagem. Tente de novo.', 502);

  const { error: erroRegistro } = await sessao.supabase.from('media').insert({
    id,
    venue_id: sessao.casaId,
    storage_path: caminho,
    nome: entrada.nome,
    alt,
    largura: validacao.dimensoes.largura,
    altura: validacao.dimensoes.altura,
    bytes: entrada.bytes.length,
    mime: 'image/webp',
    tem_pessoa: entrada.temPessoa,
    autorizacao_imagem: entrada.autorizacaoImagem,
    criado_por: sessao.usuarioId,
  });

  if (erroRegistro) {
    await sessao.supabase.storage.from('midia').remove([caminho]);
    return falha('Não deu para registrar a imagem no acervo.', 502);
  }

  // Devolve o item já com a prévia assinada. Sem isto o painel precisaria
  // recarregar a página inteira só para conseguir mostrar o que acabou de
  // enviar, e recarregar no meio de uma troca é onde o dono se perde.
  const { data: assinada } = await sessao.supabase.storage
    .from('midia')
    .createSignedUrl(caminho, SEGUNDOS_DE_PREVIA);

  return {
    ok: true,
    valor: {
      item: {
        id,
        nome: entrada.nome,
        alt,
        largura: validacao.dimensoes.largura,
        altura: validacao.dimensoes.altura,
        bytes: entrada.bytes.length,
        autorizacaoImagem: entrada.autorizacaoImagem,
        criadoEm: new Date().toISOString(),
        previa: assinada?.signedUrl ?? null,
        vagas: [],
      },
    },
  };
}

/** Aponta uma vaga do site para uma foto do acervo. */
export async function definirVaga(
  sessao: Sessao,
  chave: unknown,
  mediaId: unknown,
): Promise<Resultado<null>> {
  if (!ehChaveDeVaga(chave)) return falha('Essa posição não existe no site.');
  if (typeof mediaId !== 'string' || !mediaId) return falha('Escolha uma foto.');

  // A foto é desta casa? A RLS já garantiria, mas devolver "não encontrada" é
  // melhor que devolver um erro de constraint do Postgres para o dono.
  const { data: foto } = await sessao.supabase
    .from('media')
    .select('id')
    .eq('venue_id', sessao.casaId)
    .eq('id', mediaId)
    .maybeSingle();
  if (!foto) return falha('Foto não encontrada no acervo.', 404);

  const { error } = await sessao.supabase.from('media_slots').upsert(
    {
      venue_id: sessao.casaId,
      chave,
      media_id: mediaId,
      atualizado_em: new Date().toISOString(),
      atualizado_por: sessao.usuarioId,
    },
    { onConflict: 'venue_id,chave' },
  );
  if (error) return falha('Não deu para trocar a foto dessa posição.', 502);

  return { ok: true, valor: null };
}

/** Devolve a vaga ao arquivo versionado no repositório. (o piso do ADR-007) */
export async function limparVaga(sessao: Sessao, chave: unknown): Promise<Resultado<null>> {
  if (!ehChaveDeVaga(chave)) return falha('Essa posição não existe no site.');
  const { error } = await sessao.supabase
    .from('media_slots')
    .delete()
    .eq('venue_id', sessao.casaId)
    .eq('chave', chave);
  if (error) return falha('Não deu para voltar essa posição ao padrão.', 502);
  return { ok: true, valor: null };
}

/**
 * Apaga uma foto da galeria.
 * Foto que está no ar não é apagada, a FK é `on delete restrict` de propósito,
 * e a mensagem aqui existe para o erro do banco não chegar cru na tela.
 */
export async function apagarDoAcervo(sessao: Sessao, mediaId: unknown): Promise<Resultado<null>> {
  if (typeof mediaId !== 'string' || !mediaId) return falha('Escolha uma foto.');

  const { data: foto } = await sessao.supabase
    .from('media')
    .select('storage_path')
    .eq('venue_id', sessao.casaId)
    .eq('id', mediaId)
    .maybeSingle();
  if (!foto) return falha('Foto não encontrada no acervo.', 404);

  const { count } = await sessao.supabase
    .from('media_slots')
    .select('chave', { count: 'exact', head: true })
    .eq('venue_id', sessao.casaId)
    .eq('media_id', mediaId);
  if ((count ?? 0) > 0) {
    return falha('Essa foto está no ar em alguma posição do site. Troque a posição antes de apagar.');
  }

  const { error } = await sessao.supabase
    .from('media')
    .delete()
    .eq('venue_id', sessao.casaId)
    .eq('id', mediaId);
  if (error) return falha('Não deu para apagar a foto.', 502);

  await sessao.supabase.storage.from('midia').remove([foto.storage_path]);
  return { ok: true, valor: null };
}

/**
 * Manda o site reconstruir. É o passo que leva a troca do banco para o ar.
 *
 * O freio mora no BANCO e não em memória: cada requisição da Vercel pode cair
 * numa instância diferente, então trava em memória não trava nada. (ADR-008)
 */
export async function publicar(sessao: Sessao): Promise<Resultado<{ segundos: number }>> {
  const gancho = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  if (!gancho) {
    return falha(
      'A publicação automática ainda não foi configurada. Falta a variável VERCEL_DEPLOY_HOOK_URL.',
      503,
    );
  }

  const { data: casa } = await sessao.supabase
    .from('venues')
    .select('ultima_publicacao_em')
    .eq('id', sessao.casaId)
    .maybeSingle();

  const ultima = casa?.ultima_publicacao_em ? new Date(casa.ultima_publicacao_em).getTime() : 0;
  const desde = Math.floor((Date.now() - ultima) / 1000);
  if (desde < SEGUNDOS_ENTRE_PUBLICACOES) {
    return falha(
      `O site já está sendo publicado. Espere ${SEGUNDOS_ENTRE_PUBLICACOES - desde}s antes de mandar de novo.`,
      429,
    );
  }

  // Carimba ANTES de disparar: se o gancho responder devagar e o dono clicar de
  // novo, o segundo clique já encontra o freio armado.
  await sessao.supabase
    .from('venues')
    .update({ ultima_publicacao_em: new Date().toISOString() })
    .eq('id', sessao.casaId);

  try {
    const resposta = await fetch(gancho, { method: 'POST' });
    if (!resposta.ok) return falha('A Vercel recusou o pedido de publicação.', 502);
  } catch {
    return falha('Não deu para falar com a Vercel. Tente de novo em um minuto.', 502);
  }

  return { ok: true, valor: { segundos: SEGUNDOS_ENTRE_PUBLICACOES } };
}
