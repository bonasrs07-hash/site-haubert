/**
 * Camada de serviços, a casa e suas marcas.
 *
 * O ÚNICO ponto que sabe de onde o dado vem. Componente chama daqui e recebe o
 * shape pronto para a UI. (P-001)
 *
 * Agora lê do BANCO, com `src/constants/casa.ts` como piso — mesma arquitetura
 * das fotos e do cardápio (ADR-008). O que isso destrava não é pequeno:
 * endereço, horário e WhatsApp eram BLK-003 e BLK-005, e nenhum dos dois
 * estava parado por ser difícil. Estavam parados porque dependiam de alguém
 * mandar dado por mensagem para um desenvolvedor digitar num arquivo. Agora o
 * dono digita no painel e clica em Publicar.
 *
 * `horarioLegivel` deixou de ser campo e virou DERIVADO das faixas
 * (`horario-texto.ts`). Dois campos que significam a mesma coisa divergem — é
 * questão de quando, não de se — e a divergência apareceria do pior jeito: o
 * site escrito "até 19h" com a bolinha dizendo "aberto" às 20h.
 *
 * As funções de relógio moram em `horario.ts`: puras e sem dado, para poderem
 * ir ao browser sozinhas.
 */
import { CASA, MARCA_CASA, MARCA_HAUBERT } from '@/constants/casa';
import { estaAbertaEm } from './horario';
import { ehListaDeFaixas, formatarHorario } from './horario-texto';
import { supabaseServidor } from './supabase';
import { temValor } from './texto';
import type { Casa, Marca, Modo } from './tipos';

export {
  CORTE_NOITE_MIN,
  FIM_DA_NOITE_MIN,
  FUSO_DA_CASA,
  diaDaSemanaNaCasa,
  estaAbertaEm,
  minutosAgoraNaCasa,
  modoPelaHora,
} from './horario';

/** O valor do banco só ganha do piso quando é valor de verdade. (RN-43) */
function preferir(doBanco: unknown, piso: string): string {
  return typeof doBanco === 'string' && temValor(doBanco) ? doBanco : piso;
}

/**
 * Monta a marca a partir do piso mais o que veio do banco.
 * A copy NÃO vem do banco: ela sai de `brand/` e o dono não a edita no painel.
 * (memory/restrictions.md — "a copy vem de brand/")
 */
function fundirMarca(piso: Marca, linha: Record<string, unknown> | undefined): Marca {
  if (!linha) return { ...piso, horarioLegivel: formatarHorario(piso.horario) || piso.horarioLegivel };

  const horario = ehListaDeFaixas(linha.horario) && linha.horario.length ? linha.horario : piso.horario;

  return {
    ...piso,
    nome: preferir(linha.nome, piso.nome),
    mote: preferir(linha.mote, piso.mote),
    instagram: preferir(linha.instagram, piso.instagram),
    instagramUrl: temValor(String(linha.instagram ?? ''))
      ? `https://instagram.com/${String(linha.instagram).replace(/^@/, '')}`
      : piso.instagramUrl,
    horario,
    // Derivado, sempre. Se as faixas não renderem frase, cai no piso em vez de
    // deixar a tela vazia.
    horarioLegivel: formatarHorario(horario) || piso.horarioLegivel,
  };
}

async function lerDoBanco(): Promise<Casa> {
  const piso: Casa = {
    ...CASA,
    marcas: CASA.marcas.map((m) => fundirMarca(m, undefined)),
  };

  const slug = import.meta.env.PUBLIC_VENUE_SLUG;
  if (!slug) return piso;

  try {
    const supabase = supabaseServidor();

    // Sem `select *`: campos explícitos. (docs/11_SEGURANCA)
    const { data: casa } = await supabase
      .from('venues')
      .select('id, nome, cidade, uf, endereco, telefone, whatsapp, latitude, longitude')
      .eq('slug', slug)
      .maybeSingle();
    if (!casa) return piso;

    const { data: marcas } = await supabase
      .from('brands')
      .select('slug, nome, mote, instagram, horario, modo, ordem')
      .eq('venue_id', casa.id)
      .order('ordem');

    const porSlug = new Map((marcas ?? []).map((m) => [m.slug, m as Record<string, unknown>]));

    return {
      ...CASA,
      nome: preferir(casa.nome, CASA.nome),
      cidade: preferir(casa.cidade, CASA.cidade),
      uf: preferir(casa.uf, CASA.uf),
      endereco: preferir(casa.endereco, CASA.endereco),
      telefone: preferir(casa.telefone, CASA.telefone),
      whatsapp: preferir(casa.whatsapp, CASA.whatsapp),
      marcas: CASA.marcas.map((m) => fundirMarca(m, porSlug.get(m.slug))),
    };
  } catch {
    // O site nunca deixa de compilar por causa do banco. (F-006)
    return piso;
  }
}

/**
 * Uma leitura por build. A home sozinha chama isto em seis componentes; sem
 * cache seriam seis idas ao banco para a mesma resposta.
 *
 * ATENÇÃO: o painel NÃO lê por aqui. Ele tem leitura própria e sem cache
 * (`lerCasaParaPainel`), senão o dono salvaria o endereço, recarregaria e
 * continuaria vendo o antigo.
 */
let cache: Promise<Casa> | null = null;

export function buscarCasa(): Promise<Casa> {
  cache ??= lerDoBanco();
  return cache;
}

export async function buscarMarcas(): Promise<Marca[]> {
  return (await buscarCasa()).marcas;
}

export async function buscarMarca(slug: string): Promise<Marca | undefined> {
  return (await buscarMarcas()).find((m) => m.slug === slug);
}

export async function buscarMarcaPorModo(modo: Modo): Promise<Marca> {
  const marcas = await buscarMarcas();
  const achada = marcas.find((m) => m.modo === modo);
  return achada ?? (modo === 'noite' ? MARCA_HAUBERT : MARCA_CASA);
}

/** A outra marca, usada pelo alternador e pelas chamadas cruzadas. */
export async function buscarMarcaOposta(modo: Modo): Promise<Marca> {
  return buscarMarcaPorModo(modo === 'noite' ? 'dia' : 'noite');
}

/** A marca está aberta agora? `null` = horário não confirmado. (RN-43) */
export function estaAberta(marca: Marca, agora: Date = new Date()): boolean | null {
  return estaAbertaEm(marca.horario, agora);
}
