/**
 * Horário e relógio da casa — funções puras, sem nenhuma dependência de dado.
 *
 * Vive separado de `casa.ts` de propósito: a barra de reserva precisa destas
 * funções no browser, e importá-las de `casa.ts` arrastaria `constants/casa.ts`
 * inteiro — toda a copy do site — para dentro do bundle do cliente. (P-002)
 */
import type { FaixaHorario, Modo } from './tipos';

/** Fuso da casa. "Aberto agora" é no relógio dela, não no do visitante. (RN-41) */
export const FUSO_DA_CASA = 'America/Sao_Paulo';

/** Hora, em minutos desde a meia-noite, a partir da qual o padrão é Noite. (RN-02) */
export const CORTE_NOITE_MIN = 19 * 60;
/** Antes disso ainda é madrugada — segue Noite. (RN-02) */
export const FIM_DA_NOITE_MIN = 5 * 60;

/**
 * Modo padrão a partir de uma hora do dia.
 *
 * A hora define o PADRÃO, nunca restringe: o visitante alterna quando quiser.
 * (RN-03) A mesma regra está duplicada, de propósito, no script inline do
 * `<head>` — lá ela precisa rodar antes de qualquer módulo carregar, senão a
 * página pisca. (ADR-004)
 */
export function modoPelaHora(minutosDoDia: number): Modo {
  return minutosDoDia >= CORTE_NOITE_MIN || minutosDoDia < FIM_DA_NOITE_MIN ? 'noite' : 'dia';
}

/** Minutos desde a meia-noite, no fuso da casa. */
export function minutosAgoraNaCasa(agora: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_DA_CASA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(agora);

  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? '0');
  const minuto = Number(partes.find((p) => p.type === 'minute')?.value ?? '0');
  // pt-BR devolve 24 para a meia-noite; para nós ela é o minuto zero.
  return (hora % 24) * 60 + minuto;
}

/** Dia da semana no fuso da casa. 0 = domingo. */
export function diaDaSemanaNaCasa(agora: Date = new Date()): number {
  const nome = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_DA_CASA,
    weekday: 'short',
  }).format(agora);
  const mapa: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return mapa[nome] ?? 0;
}

function paraMinutos(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Estas faixas estão abertas agora?
 *
 * Faixa que cruza a meia-noite conta para o dia em que começou. (RN-42)
 * Lista vazia devolve `null` — que a UI traduz para "consulte pelo WhatsApp",
 * nunca para "fechado". Dizer que está fechado por falta de dado custa uma
 * mesa; dizer "confirme" não custa nada. (RN-43)
 */
export function estaAbertaEm(faixas: FaixaHorario[], agora: Date = new Date()): boolean | null {
  if (!faixas || faixas.length === 0) return null;

  const minutos = minutosAgoraNaCasa(agora);
  const dia = diaDaSemanaNaCasa(agora);
  const ontem = (dia + 6) % 7;

  for (const faixa of faixas) {
    const abre = paraMinutos(faixa.abre);
    const fecha = paraMinutos(faixa.fecha);
    // 19:00–00:00 fecha na meia-noite do dia seguinte, não às 19h.
    const cruzaMeiaNoite = fecha <= abre;

    if (faixa.dias.includes(dia) && minutos >= abre && (cruzaMeiaNoite || minutos < fecha)) {
      return true;
    }
    // Faixa de ontem que atravessou a meia-noite e ainda está correndo.
    if (cruzaMeiaNoite && faixa.dias.includes(ontem) && minutos < fecha) {
      return true;
    }
  }
  return false;
}
