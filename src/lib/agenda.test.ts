/**
 * Duas coisas aqui erram calado, e por isso são testadas.
 *
 * O corte de "já passou": agenda desatualizada é pior que agenda nenhuma,
 * porque ensina o visitante a não confiar na página.
 *
 * O fuso: `datetime-local` não tem fuso. Ler '21:00' como UTC atrasa o evento
 * em três horas, e o site anuncia 18h para uma festa que começa às 21h.
 */
import { describe, expect, it } from 'vitest';
import { comFusoDaCasa, daquiPraFrente, gerarSlug, paraCampoLocal, type EventoDatado } from './agenda';

const evento = (inicio: string, fim: string | null = null): EventoDatado => ({
  id: inicio,
  slug: 'e',
  titulo: 'Evento',
  descricao: '',
  inicioEm: inicio,
  fimEm: fim,
  lineup: [],
  marcaSlug: null,
  publicado: true,
});

describe('daquiPraFrente', () => {
  const agora = new Date('2026-09-12T20:00:00-03:00');

  it('mantém o que ainda vai acontecer e corta o que passou', () => {
    const r = daquiPraFrente(
      [
        evento('2026-09-20T21:00:00-03:00'),
        evento('2026-09-01T21:00:00-03:00'),
        evento('2026-09-13T21:00:00-03:00'),
      ],
      agora,
    );
    expect(r.map((e) => e.inicioEm)).toEqual([
      '2026-09-13T21:00:00-03:00',
      '2026-09-20T21:00:00-03:00',
    ]);
  });

  it('não some com a festa no meio dela', () => {
    // Começou às 22h de ontem; agora são 20h de hoje... mas a margem de 6h é
    // para o caso oposto: evento de hoje as 18h, agora 20h, ainda vale.
    const emAndamento = evento('2026-09-12T18:00:00-03:00');
    expect(daquiPraFrente([emAndamento], agora)).toHaveLength(1);
  });

  it('respeita o fim quando ele existe', () => {
    // Começou ontem e termina amanhã: continua na agenda.
    const longo = evento('2026-09-10T21:00:00-03:00', '2026-09-14T02:00:00-03:00');
    expect(daquiPraFrente([longo], agora)).toHaveLength(1);
  });

  it('devolve em ordem cronológica, não na ordem que chegou', () => {
    const r = daquiPraFrente(
      [evento('2026-10-01T21:00:00-03:00'), evento('2026-09-14T21:00:00-03:00')],
      agora,
    );
    expect(r[0].inicioEm).toBe('2026-09-14T21:00:00-03:00');
  });

  it('lista vazia continua vazia', () => {
    expect(daquiPraFrente([], agora)).toEqual([]);
  });
});

describe('gerarSlug', () => {
  it('tira acento, espaço e pontuação', () => {
    expect(gerarSlug('In The Flow')).toBe('in-the-flow');
    expect(gerarSlug('Resenha & Churrasco')).toBe('resenha-churrasco');
    expect(gerarSlug('Noite de São João!')).toBe('noite-de-sao-joao');
  });

  it('não deixa traço sobrando nas pontas', () => {
    expect(gerarSlug('  ...Bons Tempos...  ')).toBe('bons-tempos');
  });

  it('não estoura o tamanho da URL', () => {
    expect(gerarSlug('a'.repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe('fuso da casa', () => {
  it('lê o campo do browser como horário de Brasília, não como UTC', () => {
    // Sem isto, uma festa das 21h seria anunciada como 18h.
    expect(comFusoDaCasa('2026-09-12T21:00')).toBe('2026-09-13T00:00:00.000Z');
  });

  it('recusa o que não é data', () => {
    expect(comFusoDaCasa('sábado à noite')).toBeNull();
    expect(comFusoDaCasa('2026-09-12')).toBeNull();
  });

  it('vai e volta sem deslocar a hora', () => {
    const local = '2026-09-12T21:00';
    expect(paraCampoLocal(comFusoDaCasa(local)!)).toBe(local);
  });

  it('não quebra com ISO inválido', () => {
    expect(paraCampoLocal('nada disso')).toBe('');
  });
});
