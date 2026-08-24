/**
 * Camada de serviços — a casa e suas marcas.
 *
 * O ÚNICO ponto que sabe de onde o dado vem. Componente chama daqui e recebe o
 * shape pronto para a UI. (P-001)
 *
 * Fase 1: lê de `src/constants/casa.ts`.
 * Fase 2: troca a origem para o Supabase sem que nenhum componente mude.
 *
 * As funções de relógio moram em `horario.ts` — puras e sem dado, para poderem
 * ir ao browser sozinhas.
 */
import { CASA, MARCA_CASA, MARCA_HAUBERT } from '@/constants/casa';
import { estaAbertaEm } from './horario';
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

export function buscarCasa(): Casa {
  return CASA;
}

export function buscarMarcas(): Marca[] {
  return CASA.marcas;
}

export function buscarMarca(slug: string): Marca | undefined {
  return CASA.marcas.find((m) => m.slug === slug);
}

export function buscarMarcaPorModo(modo: Modo): Marca {
  return modo === 'noite' ? MARCA_HAUBERT : MARCA_CASA;
}

/** A outra marca — usada pelo alternador e pelas chamadas cruzadas. */
export function buscarMarcaOposta(modo: Modo): Marca {
  return modo === 'noite' ? MARCA_CASA : MARCA_HAUBERT;
}

/** A marca está aberta agora? `null` = horário não confirmado. (RN-43) */
export function estaAberta(marca: Marca, agora: Date = new Date()): boolean | null {
  return estaAbertaEm(marca.horario, agora);
}
