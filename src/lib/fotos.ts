/**
 * Camada de serviços — as fotos do site. (ADR-008, P-001)
 *
 * Resolve cada VAGA (`src/constants/vagas.ts`) na foto que deve aparecer nela.
 * Isto roda no BUILD, nunca no browser: o site publicado serve os derivados
 * `/_astro/*.webp` que o `astro:assets` gerou, e não aponta para o Supabase.
 *
 * Por que service_role aqui: no build não existe usuário logado, e as tabelas
 * `media`/`media_slots` não têm policy de leitura para `anon` de propósito —
 * a galeria guarda foto que o dono ainda não publicou. Este arquivo é servidor
 * puro; `supabaseServidor()` explode se alguém o arrastar para o cliente.
 *
 * REGRA QUE NÃO SE NEGOCIA: se qualquer coisa der errado — sem `.env`, banco
 * fora do ar, vaga vazia, URL que não assina — a resposta é o arquivo
 * versionado em `src/assets/marca/`. O build NUNCA falha por causa do banco.
 * Site com a foto da semana passada é um problema pequeno; site que não
 * compila é o fim do dia. (F-006)
 */
import type { ImageMetadata } from 'astro';
import { VAGAS, type ChaveVaga } from '@/constants/vagas';
import { supabaseServidor } from './supabase';

/**
 * Uma foto pronta para o `<Image>`: ou um arquivo do repositório
 * (`ImageMetadata`) ou uma URL remota — e, nos dois casos, as dimensões, que o
 * Astro exige explicitamente para otimizar imagem remota.
 */
export interface FotoResolvida {
  src: ImageMetadata | string;
  alt: string;
  largura: number;
  altura: number;
  /** Veio do banco? Só o painel e os testes se importam. */
  doAcervo: boolean;
}

/** Vida da URL assinada. Só precisa sobreviver ao build que a criou. */
const SEGUNDOS_DE_ASSINATURA = 60 * 60;

function doArquivo(padrao: { src: ImageMetadata; alt: string }): FotoResolvida {
  return {
    src: padrao.src,
    alt: padrao.alt,
    largura: padrao.src.width,
    altura: padrao.src.height,
    doAcervo: false,
  };
}

interface LinhaDoManifesto {
  chave: string;
  media: {
    storage_path: string;
    alt: string;
    largura: number;
    altura: number;
  } | null;
}

/**
 * Lê do banco quais fotos estão em quais vagas e assina as URLs.
 * Devolve um mapa vazio em qualquer cenário de falha — quem chama trata isso
 * como "usar o padrão", que é o comportamento correto.
 */
async function lerManifesto(): Promise<Map<string, FotoResolvida>> {
  const vazio = new Map<string, FotoResolvida>();
  const slug = import.meta.env.PUBLIC_VENUE_SLUG;
  if (!slug) return vazio;

  try {
    const supabase = supabaseServidor();

    const { data: casa, error: erroCasa } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (erroCasa || !casa) return vazio;

    // Sem `select *`: campos explícitos, como manda docs/11_SEGURANCA.
    const { data, error } = await supabase
      .from('media_slots')
      .select('chave, media:media_id (storage_path, alt, largura, altura)')
      .eq('venue_id', casa.id);
    if (error || !data) return vazio;

    const linhas = data as unknown as LinhaDoManifesto[];
    const comArquivo = linhas.filter((l) => l.media);
    if (comArquivo.length === 0) return vazio;

    const { data: assinadas, error: erroAssinatura } = await supabase.storage
      .from('midia')
      .createSignedUrls(
        comArquivo.map((l) => l.media!.storage_path),
        SEGUNDOS_DE_ASSINATURA,
      );
    if (erroAssinatura || !assinadas) return vazio;

    const urlPorCaminho = new Map<string, string>();
    for (const a of assinadas) {
      if (a.signedUrl && !a.error) urlPorCaminho.set(a.path ?? '', a.signedUrl);
    }

    const mapa = new Map<string, FotoResolvida>();
    for (const linha of comArquivo) {
      const url = urlPorCaminho.get(linha.media!.storage_path);
      if (!url) continue;
      mapa.set(linha.chave, {
        src: url,
        alt: linha.media!.alt,
        largura: linha.media!.largura,
        altura: linha.media!.altura,
        doAcervo: true,
      });
    }
    return mapa;
  } catch {
    // Silêncio proposital: o fallback JÁ é o comportamento correto, e um build
    // que quebra porque o banco piscou é pior que uma foto desatualizada.
    return vazio;
  }
}

/**
 * Uma leitura por build, não uma por componente. A home sozinha pede 13 vagas
 * em 3 componentes; sem isto seriam 3 idas ao banco para a mesma resposta.
 */
let acervo: Promise<Map<ChaveVaga, FotoResolvida>> | null = null;

export function buscarAcervo(): Promise<Map<ChaveVaga, FotoResolvida>> {
  acervo ??= (async () => {
    const doBanco = await lerManifesto();
    const mapa = new Map<ChaveVaga, FotoResolvida>();
    for (const vaga of VAGAS) {
      mapa.set(vaga.chave, doBanco.get(vaga.chave) ?? doArquivo(vaga.padrao));
    }
    return mapa;
  })();
  return acervo;
}

/** A foto de uma vaga. Nunca devolve nulo: vaga sem foto cai no padrão. */
export async function buscarFoto(chave: ChaveVaga): Promise<FotoResolvida> {
  return (await buscarAcervo()).get(chave)!;
}

/** As fotos de várias vagas, na ordem pedida. */
export async function buscarFotos(chaves: ChaveVaga[]): Promise<FotoResolvida[]> {
  const mapa = await buscarAcervo();
  return chaves.map((c) => mapa.get(c)!);
}
