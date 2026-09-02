/**
 * O agrupamento da `/memoria`.
 *
 * O que estes casos protegem, em ordem de dano: evento futuro aparecendo como
 * memória (a casa anunciaria como passado o que ainda vai acontecer), edição
 * sumindo por não casar com formato nenhum, e ordem invertida, que faria a
 * primeira edição da história abrir a prateleira em vez da mais recente.
 */
import { describe, it, expect } from 'vitest';
import type { EventoDatado } from './agenda';
import {
  jaPassou,
  jaAconteceram,
  agruparPorFormato,
  contarEdicoes,
  type FormatoConhecido,
} from './memoria';

const AGORA = new Date('2026-09-02T20:00:00.000Z');

const FORMATOS: FormatoConhecido[] = [
  { slug: 'in-the-flow', titulo: 'In The Flow', descricao: 'a', cadencia: 'Mensal' },
  { slug: 'resenha', titulo: 'Resenha', descricao: 'b', cadencia: 'Quinzenal' },
  { slug: 'matcha-club', titulo: 'Matcha Club', descricao: 'c', cadencia: 'Semanal' },
];

function evento(parcial: Partial<EventoDatado> & { titulo: string; inicioEm: string }): EventoDatado {
  return {
    id: parcial.titulo + parcial.inicioEm,
    slug: parcial.titulo.toLowerCase().replace(/\s+/g, '-'),
    descricao: '',
    fimEm: null,
    lineup: [],
    marcaSlug: null,
    publicado: true,
    ...parcial,
  };
}

describe('jaPassou', () => {
  it('evento de semana passada é memória', () => {
    expect(jaPassou(evento({ titulo: 'Resenha', inicioEm: '2026-08-26T23:00:00.000Z' }), AGORA)).toBe(true);
  });

  it('evento de semana que vem não é memória', () => {
    expect(jaPassou(evento({ titulo: 'Resenha', inicioEm: '2026-09-09T23:00:00.000Z' }), AGORA)).toBe(false);
  });

  it('a festa que começou há duas horas ainda está acontecendo', () => {
    // A tolerância de seis horas existe para isto: a casa não chama de memória
    // a noite em que as pessoas ainda estão.
    expect(jaPassou(evento({ titulo: 'Resenha', inicioEm: '2026-09-02T18:00:00.000Z' }), AGORA)).toBe(false);
  });

  it('quando há fim, é o fim que decide', () => {
    const varou = evento({
      titulo: 'Resenha',
      inicioEm: '2026-09-01T23:00:00.000Z',
      fimEm: '2026-09-02T05:00:00.000Z',
    });
    // Terminou 15h atrás: passou da tolerância, virou memória.
    expect(jaPassou(varou, AGORA)).toBe(true);
  });
});

describe('jaAconteceram', () => {
  it('devolve só o passado, do mais recente para o mais antigo', () => {
    const lista = jaAconteceram(
      [
        evento({ titulo: 'Antigo', inicioEm: '2026-01-10T23:00:00.000Z' }),
        evento({ titulo: 'Futuro', inicioEm: '2026-12-01T23:00:00.000Z' }),
        evento({ titulo: 'Recente', inicioEm: '2026-08-20T23:00:00.000Z' }),
      ],
      AGORA,
    );
    expect(lista.map((e) => e.titulo)).toEqual(['Recente', 'Antigo']);
  });

  it('lista vazia não quebra', () => {
    expect(jaAconteceram([], AGORA)).toEqual([]);
  });
});

describe('agruparPorFormato', () => {
  it('junta as edições de um mesmo formato na ordem recebida', () => {
    const grupos = agruparPorFormato(
      [
        evento({ titulo: 'Resenha #12', inicioEm: '2026-08-20T23:00:00.000Z' }),
        evento({ titulo: 'Resenha #11', inicioEm: '2026-08-06T23:00:00.000Z' }),
      ],
      FORMATOS,
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0].chave).toBe('resenha');
    expect(grupos[0].edicoes.map((e) => e.titulo)).toEqual(['Resenha #12', 'Resenha #11']);
  });

  it('formato sem edição não vira prateleira vazia', () => {
    const grupos = agruparPorFormato(
      [evento({ titulo: 'Resenha #1', inicioEm: '2026-08-20T23:00:00.000Z' })],
      FORMATOS,
    );
    expect(grupos.map((g) => g.chave)).toEqual(['resenha']);
  });

  it('respeita a ordem editorial dos formatos, não a alfabética', () => {
    const grupos = agruparPorFormato(
      [
        evento({ titulo: 'Matcha Club de agosto', inicioEm: '2026-08-28T13:00:00.000Z' }),
        evento({ titulo: 'In The Flow vol. 3', inicioEm: '2026-08-01T23:00:00.000Z' }),
      ],
      FORMATOS,
    );
    expect(grupos.map((g) => g.chave)).toEqual(['in-the-flow', 'matcha-club']);
  });

  it('ignora acento e caixa no casamento do título', () => {
    const grupos = agruparPorFormato(
      [evento({ titulo: 'RESENHA de verão', inicioEm: '2026-08-20T23:00:00.000Z' })],
      [{ slug: 'resenha', titulo: 'Resenhá', descricao: '', cadencia: '' }],
    );
    expect(grupos[0].edicoes).toHaveLength(1);
  });

  it('evento que não casa com formato nenhum cai em "Outras noites", nunca some', () => {
    const grupos = agruparPorFormato(
      [
        evento({ titulo: 'Réveillon 2026', inicioEm: '2025-12-31T23:00:00.000Z' }),
        evento({ titulo: 'Resenha #1', inicioEm: '2026-08-20T23:00:00.000Z' }),
      ],
      FORMATOS,
    );
    expect(grupos.map((g) => g.chave)).toEqual(['resenha', 'outras']);
    expect(grupos[1].edicoes.map((e) => e.titulo)).toEqual(['Réveillon 2026']);
  });

  it('cada edição entra em exatamente um grupo', () => {
    const entrada = [
      evento({ titulo: 'Resenha #2', inicioEm: '2026-08-20T23:00:00.000Z' }),
      evento({ titulo: 'In The Flow', inicioEm: '2026-07-20T23:00:00.000Z' }),
      evento({ titulo: 'Sarau', inicioEm: '2026-06-20T23:00:00.000Z' }),
    ];
    const grupos = agruparPorFormato(entrada, FORMATOS);
    expect(contarEdicoes(grupos)).toBe(entrada.length);
  });

  it('sem nada que tenha acontecido, não há prateleira', () => {
    expect(agruparPorFormato([], FORMATOS)).toEqual([]);
    expect(contarEdicoes([])).toBe(0);
  });
});
