import { describe, expect, it } from 'vitest';
import { estaAbertaEm, modoPelaHora } from './horario';
import type { FaixaHorario } from './tipos';

/**
 * Datas em UTC. Novo Hamburgo é UTC-3 o ano inteiro (o Brasil não usa horário
 * de verão desde 2019), então 22:00Z = 19:00 na casa.
 */
const emBrasilia = (iso: string) => new Date(iso);

describe('modoPelaHora', () => {
  it('vira para Noite às 19h em ponto', () => {
    expect(modoPelaHora(18 * 60 + 59)).toBe('dia');
    expect(modoPelaHora(19 * 60)).toBe('noite');
  });

  it('mantém Noite na madrugada, até as 5h', () => {
    expect(modoPelaHora(0)).toBe('noite');
    expect(modoPelaHora(4 * 60 + 59)).toBe('noite');
    expect(modoPelaHora(5 * 60)).toBe('dia');
  });
});

describe('estaAbertaEm', () => {
  // CASA: seg–sex 8h–19h, sáb/dom 9h–19h.
  const casa: FaixaHorario[] = [
    { dias: [1, 2, 3, 4, 5], abre: '08:00', fecha: '19:00' },
    { dias: [6, 0], abre: '09:00', fecha: '19:00' },
  ];

  // HAUBERT: qui–dom a partir das 19h, fechando à meia-noite.
  const haubert: FaixaHorario[] = [{ dias: [4, 5, 6, 0], abre: '19:00', fecha: '00:00' }];

  it('sem horário cadastrado devolve null, nunca false', () => {
    // A UI traduz null para "confirme com a equipe". Dizer "fechado" por falta
    // de dado manda o cliente embora de uma casa aberta. (RN-43)
    expect(estaAbertaEm([])).toBeNull();
  });

  it('CASA aberta numa quarta ao meio-dia', () => {
    // 2026-08-26 é quarta-feira. 15:00Z = 12:00 em Novo Hamburgo.
    expect(estaAbertaEm(casa, emBrasilia('2026-08-26T15:00:00Z'))).toBe(true);
  });

  it('CASA fechada numa quarta às 20h', () => {
    expect(estaAbertaEm(casa, emBrasilia('2026-08-26T23:00:00Z'))).toBe(false);
  });

  it('CASA fechada numa quarta às 7h, antes de abrir', () => {
    expect(estaAbertaEm(casa, emBrasilia('2026-08-26T10:00:00Z'))).toBe(false);
  });

  it('HAUBERT fechado na quarta, mesmo às 21h', () => {
    // Abre só de quinta a domingo. Dia da semana importa antes da hora.
    expect(estaAbertaEm(haubert, emBrasilia('2026-08-27T00:00:00Z'))).toBe(false);
  });

  it('HAUBERT aberto na sexta às 21h', () => {
    // 2026-08-28 é sexta. 2026-08-29T00:00Z = sexta 21:00 na casa.
    expect(estaAbertaEm(haubert, emBrasilia('2026-08-29T00:00:00Z'))).toBe(true);
  });

  it('HAUBERT ainda fechado na sexta às 18h59', () => {
    expect(estaAbertaEm(haubert, emBrasilia('2026-08-28T21:59:00Z'))).toBe(false);
  });

  it('HAUBERT abre às 19h em ponto', () => {
    expect(estaAbertaEm(haubert, emBrasilia('2026-08-28T22:00:00Z'))).toBe(true);
  });

  it('faixa que cruza a meia-noite conta para o dia em que começou', () => {
    // Sábado 02:00 na casa é a noite de SEXTA ainda correndo. O sábado também
    // está na lista, mas o que precisa passar aqui é a herança da véspera.
    const soSexta: FaixaHorario[] = [{ dias: [5], abre: '19:00', fecha: '02:00' }];
    expect(estaAbertaEm(soSexta, emBrasilia('2026-08-29T04:00:00Z'))).toBe(true); // sáb 01:00
    expect(estaAbertaEm(soSexta, emBrasilia('2026-08-29T06:00:00Z'))).toBe(false); // sáb 03:00
  });

  it('fecha à meia-noite: 23:59 aberto, 00:01 fechado quando o dia seguinte não abre', () => {
    // Domingo abre; segunda não. Um minuto depois da meia-noite de domingo
    // ainda é a noite de domingo, e ela vai até 00:00, ou seja, acabou.
    const soDomingo: FaixaHorario[] = [{ dias: [0], abre: '19:00', fecha: '00:00' }];
    expect(estaAbertaEm(soDomingo, emBrasilia('2026-08-31T02:59:00Z'))).toBe(true); // dom 23:59
    expect(estaAbertaEm(soDomingo, emBrasilia('2026-08-31T03:01:00Z'))).toBe(false); // seg 00:01
  });
});
