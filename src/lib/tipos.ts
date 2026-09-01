/**
 * Tipos do domínio.
 *
 * Espelham as tabelas de `supabase/schema.sql`. Na Fase 1 os dados vêm de
 * `src/constants/casa.ts`; na Fase 2 passam a vir do Supabase sem que a UI
 * mude, é para isso que a camada de serviços existe. (P-001, ADR-002)
 */

export type Modo = 'dia' | 'noite';

/** Tokens visuais da marca, espelham src/styles/tokens.css. (ADR-004) */
export interface TokensMarca {
  superficie: string;
  superficie2: string;
  texto: string;
  textoForte: string;
  textoSuave: string;
  acento: string;
  acentoFundo: string;
  acentoTexto: string;
  borda: string;
}

/** Faixa de funcionamento por dia da semana. 0 = domingo. */
export interface FaixaHorario {
  dias: number[];
  abre: string; // 'HH:MM'
  fecha: string; // 'HH:MM', pode cruzar a meia-noite (RN-42)
}

/** Uma marca da casa: CASA (dia) ou HAUBERT (noite). */
export interface Marca {
  slug: string;
  nome: string;
  nomeCurto: string;
  /**
   * A marca como ela é ASSINADA no cabeçalho, grafia e caixa inclusas.
   * Separada de `nomeCurto` de propósito: aquele é o nome que entra em frase
   * ("reservar uma mesa no HAUBERT") e não pode mudar junto com o desenho da
   * assinatura. Sai do tenant, nunca literal no componente. (ADR-002)
   */
  logotipo: string;
  descritor: string;
  mote: string;
  modo: Modo;
  instagram: string;
  instagramUrl: string;
  seguidores: string;
  horario: FaixaHorario[];
  horarioLegivel: string;
  /** Copy vinda de brand/. Nada aqui é invenção do desenvolvedor. (P-006) */
  copy: {
    manifesto: string;
    manifestoApoio: string[];
    convite: string;
    assinatura: string;
  };
}

/** A casa, o tenant. */
export interface Casa {
  slug: string;
  nome: string;
  cidade: string;
  uf: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  marcas: Marca[];
}

export interface Pilar {
  nome: string;
  descricao: string;
}

export interface Corte {
  nome: string;
  descricao: string;
}

export interface ElementoFogo {
  numero: string;
  nome: string;
  descricao: string;
}

export interface Evento {
  slug: string;
  titulo: string;
  descricao: string;
  cadencia: string;
  marcaSlug: string | null;
}

/** Campo pendente do cliente. Ver memory/bugs.md. */
export const PENDENTE = '[[PENDENTE]]' as const;

export function ehPendente(valor: string): boolean {
  return valor.includes(PENDENTE);
}
