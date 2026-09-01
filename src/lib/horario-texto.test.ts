/**
 * A frase de horário passa a ser DERIVADA das faixas, em vez de ser um segundo
 * campo digitado à mão. Se ela errar, o site diz um horário e a bolinha de
 * "aberto agora" diz outro — que é exatamente a divergência que essa derivação
 * existe para acabar.
 */
import { describe, expect, it } from 'vitest';
import {
  agruparDias,
  ehListaDeFaixas,
  formatarFaixa,
  formatarHora,
  formatarHorario,
  paraSchemaOrg,
} from './horario-texto';

describe('formatarHora', () => {
  it('fala como a casa fala, não como o banco guarda', () => {
    expect(formatarHora('08:00')).toBe('8h');
    expect(formatarHora('19:00')).toBe('19h');
    expect(formatarHora('00:00')).toBe('0h');
  });

  it('mantém os minutos quando eles existem', () => {
    expect(formatarHora('23:30')).toBe('23h30');
    expect(formatarHora('08:15')).toBe('8h15');
  });

  it('devolve o que recebeu se não entender', () => {
    expect(formatarHora('qualquer coisa')).toBe('qualquer coisa');
  });
});

describe('agruparDias', () => {
  it('junta sequência longa com "a"', () => {
    expect(agruparDias([1, 2, 3, 4, 5])).toBe('Seg a sex');
  });

  it('junta par com "e"', () => {
    expect(agruparDias([6, 0])).toBe('Sáb e dom');
  });

  it('trata a semana como círculo, que é como o HAUBERT abre', () => {
    // Quinta a domingo. Lista reta escreveria "Qui a sáb, dom".
    expect(agruparDias([4, 5, 6, 0])).toBe('Qui a dom');
  });

  it('separa blocos que não se tocam', () => {
    expect(agruparDias([1, 2, 5, 6])).toBe('Seg e ter, sex e sáb');
  });

  it('resume a semana inteira', () => {
    expect(agruparDias([0, 1, 2, 3, 4, 5, 6])).toBe('Todo dia');
  });

  it('um dia só', () => {
    expect(agruparDias([3])).toBe('Qua');
  });

  it('ignora dia que não existe, em vez de escrever lixo', () => {
    expect(agruparDias([1, 2, 99, -1])).toBe('Seg e ter');
    expect(agruparDias([])).toBe('');
  });

  it('não se importa com a ordem nem com repetição', () => {
    expect(agruparDias([5, 1, 3, 2, 4, 1])).toBe('Seg a sex');
  });
});

describe('formatarHorario', () => {
  it('reproduz o horário da CASA como ele está escrito hoje', () => {
    const faixas = [
      { dias: [1, 2, 3, 4, 5], abre: '08:00', fecha: '19:00' },
      { dias: [6, 0], abre: '09:00', fecha: '19:00' },
    ];
    expect(formatarHorario(faixas)).toBe('Seg a sex, 8h às 19h · Sáb e dom, 9h às 19h');
  });

  it('reproduz o do HAUBERT, que cruza a meia-noite', () => {
    const faixas = [{ dias: [4, 5, 6, 0], abre: '19:00', fecha: '00:00' }];
    expect(formatarFaixa(faixas[0])).toBe('Qui a dom, 19h às 0h');
  });

  it('sem faixa devolve vazio, e NÃO uma frase inventada', () => {
    // Dizer "fechado" por falta de dado custa uma mesa. (RN-43)
    expect(formatarHorario([])).toBe('');
    expect(formatarHorario(undefined as never)).toBe('');
  });

  it('pula faixa quebrada em vez de derrubar a frase inteira', () => {
    const faixas = [
      { dias: [1], abre: '08:00', fecha: '19:00' },
      { dias: [], abre: '', fecha: '' } as never,
    ];
    expect(formatarHorario(faixas)).toBe('Seg, 8h às 19h');
  });
});

describe('ehListaDeFaixas', () => {
  it('aceita o que o banco deveria ter', () => {
    expect(ehListaDeFaixas([{ dias: [1, 2], abre: '08:00', fecha: '19:00' }])).toBe(true);
    expect(ehListaDeFaixas([])).toBe(true);
  });

  it('recusa o que JSONB deixa passar', () => {
    // `brands.horario` é JSONB, e JSONB não tem checagem de tipo. O próprio
    // schema.sql manda validar aqui.
    expect(ehListaDeFaixas({ seg: '8h' })).toBe(false);
    expect(ehListaDeFaixas([{ dias: [9], abre: '08:00', fecha: '19:00' }])).toBe(false);
    expect(ehListaDeFaixas([{ dias: [1], abre: '8h', fecha: '19h' }])).toBe(false);
    expect(ehListaDeFaixas([{ dias: 'seg', abre: '08:00', fecha: '19:00' }])).toBe(false);
    expect(ehListaDeFaixas(null)).toBe(false);
  });
});

describe('paraSchemaOrg', () => {
  it('traduz as faixas para o que a busca local do Google lê', () => {
    expect(paraSchemaOrg([{ dias: [1, 2, 3, 4, 5], abre: '08:00', fecha: '19:00' }])).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '19:00',
      },
    ]);
  });

  it('mantém o domingo no lugar certo, que é o índice 0', () => {
    const [r] = paraSchemaOrg([{ dias: [6, 0], abre: '09:00', fecha: '19:00' }]);
    expect(r.dayOfWeek).toEqual(['Saturday', 'Sunday']);
  });

  it('devolve vazio em vez de inventar horário', () => {
    // Marcação ausente é honesta. Marcação inventada vira resultado errado no
    // Google e cliente na porta fechada. (RN-43)
    expect(paraSchemaOrg([])).toEqual([]);
    expect(paraSchemaOrg({ seg: '8h' } as never)).toEqual([]);
  });
});
