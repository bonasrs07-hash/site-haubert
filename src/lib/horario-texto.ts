/**
 * Horário estruturado vira frase em português.
 *
 * Existe para haver UMA fonte de verdade. Antes, `horario` (que o relógio usa
 * para dizer "aberto agora") e `horarioLegivel` (a frase na tela) eram dois
 * campos independentes, editados à mão em `constants/casa.ts`. Dois campos que
 * significam a mesma coisa divergem — é questão de quando, não de se — e o
 * jeito que isso aparece é o pior possível: o site escrito "até 19h" com a
 * bolinha dizendo "aberto" às 20h.
 *
 * Agora o dono edita só as faixas, no painel, e a frase é derivada. Funções
 * puras, sem data e sem rede, por isso nascem com teste.
 */
import type { FaixaHorario } from './tipos';

/** Domingo é 0, como em `Date.getDay()` e como em `estaAbertaEm`. */
const NOMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** 'Seg', 'Sáb' — primeira letra maiúscula, para começar a frase. */
const comInicial = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * '08:00' vira '8h'; '19:30' vira '19h30'.
 * A casa fala "8h", não "08:00" — e a frase é lida por cliente, não por
 * máquina. Quem precisa de máquina usa `FaixaHorario`, que continua intacta.
 */
export function formatarHora(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const hora = Number(h);
  if (!Number.isFinite(hora)) return hhmm;
  return m && m !== '00' ? `${hora}h${m}` : `${hora}h`;
}

/**
 * Junta dias em sequência: [1,2,3,4,5] vira 'Seg a sex', [6,0] vira 'Sáb e dom'.
 *
 * A semana é circular de propósito: o HAUBERT abre de quinta a domingo, e
 * [4,5,6,0] só vira "Qui a dom" se 6 e 0 forem vizinhos. Tratar a semana como
 * lista reta escreveria "Qui a sáb e dom", que ninguém fala.
 */
export function agruparDias(dias: number[]): string {
  const unicos = [...new Set(dias)].filter((d) => d >= 0 && d <= 6);
  if (unicos.length === 0) return '';
  if (unicos.length === 7) return 'Todo dia';

  // Começa a leitura no primeiro dia que NÃO tem antecessor no conjunto: é o
  // que faz [4,5,6,0] começar em 4 e não em 0.
  const tem = (d: number) => unicos.includes((d + 7) % 7);
  const inicio = unicos.find((d) => !tem(d - 1)) ?? unicos[0];

  const blocos: number[][] = [];
  let atual: number[] = [];
  for (let i = 0; i < 7; i++) {
    const dia = (inicio + i) % 7;
    if (tem(dia)) {
      atual.push(dia);
    } else if (atual.length) {
      blocos.push(atual);
      atual = [];
    }
  }
  if (atual.length) blocos.push(atual);

  const pedacos = blocos.map((b) =>
    b.length >= 3
      ? `${NOMES[b[0]]} a ${NOMES[b[b.length - 1]]}`
      : b.map((d) => NOMES[d]).join(' e '),
  );

  // Maiúscula só na PRIMEIRA palavra da frase, não no começo de cada bloco:
  // "Seg e ter, sex e sáb" é português; "Seg e ter, Sex e sáb" é planilha.
  return comInicial(pedacos.join(', '));
}

/** Uma faixa inteira: 'Seg a sex, 8h às 19h'. */
export function formatarFaixa(faixa: FaixaHorario): string {
  const dias = agruparDias(faixa.dias);
  const horas = `${formatarHora(faixa.abre)} às ${formatarHora(faixa.fecha)}`;
  return dias ? `${dias}, ${horas}` : horas;
}

/**
 * O horário inteiro, como aparece na tela.
 * Ex.: 'Seg a sex, 8h às 19h · Sáb e dom, 9h às 19h'
 *
 * Sem faixa nenhuma devolve string vazia, e NÃO uma frase inventada: quem
 * chama decide o que mostrar quando não há dado. Dizer "fechado" por falta de
 * informação custa uma mesa. (RN-43)
 */
export function formatarHorario(faixas: FaixaHorario[]): string {
  if (!Array.isArray(faixas) || faixas.length === 0) return '';
  return faixas
    .filter((f) => f && Array.isArray(f.dias) && f.abre && f.fecha)
    .map(formatarFaixa)
    .join(' · ');
}

/**
 * O que veio do banco é mesmo uma lista de faixas?
 * `brands.horario` é JSONB e JSONB não tem checagem de tipo — o schema.sql diz
 * isso em voz alta e manda validar na camada de serviços.
 */
export function ehListaDeFaixas(valor: unknown): valor is FaixaHorario[] {
  return (
    Array.isArray(valor) &&
    valor.every(
      (f) =>
        f &&
        typeof f === 'object' &&
        Array.isArray((f as FaixaHorario).dias) &&
        (f as FaixaHorario).dias.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
        /^\d{2}:\d{2}$/.test(String((f as FaixaHorario).abre)) &&
        /^\d{2}:\d{2}$/.test(String((f as FaixaHorario).fecha)),
    )
  );
}

/** Dias como o schema.org espera. O índice segue `Date.getDay()`. */
const DIAS_SCHEMA = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface FaixaSchemaOrg {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/**
 * As faixas no formato que a busca local do Google lê.
 *
 * É o que responde ao problema nº3 da `docs/00_VISAO` — "quem procura
 * steakhouse Novo Hamburgo no Google não acha a casa". Sem
 * `openingHoursSpecification`, o Google sabe que existe um restaurante e não
 * sabe se ele está aberto agora, que é justamente o que a pessoa pesquisou.
 *
 * Lista vazia quando não há horário: marcação ausente é honesta, marcação
 * inventada vira resultado errado no Google e cliente na porta fechada.
 */
export function paraSchemaOrg(faixas: FaixaHorario[]): FaixaSchemaOrg[] {
  if (!ehListaDeFaixas(faixas)) return [];
  return faixas.map((f) => ({
    '@type': 'OpeningHoursSpecification' as const,
    dayOfWeek: f.dias.map((d) => DIAS_SCHEMA[d]).filter(Boolean),
    opens: f.abre,
    closes: f.fecha,
  }));
}
