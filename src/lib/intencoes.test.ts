/**
 * A intenção de reserva é a única medida que o projeto declarou como north
 * star. Se o código colidir, a contagem mente para menos; se o schema aceitar
 * lixo, a tabela vira depósito. As duas coisas são testadas aqui.
 */
import { describe, expect, it } from 'vitest';
import { FORMATO_CODIGO, gerarCodigo } from './reservas';
import { esquemaIntencao, resumir, type IntencaoRegistrada } from './intencoes';

describe('gerarCodigo', () => {
  it('sai no formato que o banco aceita', () => {
    for (let i = 0; i < 200; i++) {
      expect(gerarCodigo()).toMatch(FORMATO_CODIGO);
    }
  });

  it('não usa os caracteres que se confundem ao ditar', () => {
    // O código é lido em voz alta no balcão: O/0, I/1 e S/5 estão fora.
    const amostra = Array.from({ length: 400 }, () => gerarCodigo()).join('');
    for (const proibido of ['O', '0', 'I', '1', 'S', '5']) {
      expect(amostra).not.toContain(proibido);
    }
  });

  it('não repete com frequência absurda', () => {
    // 30^4 = 810 mil combinações. Mil sorteios não deveriam colidir muito.
    const vistos = new Set(Array.from({ length: 1000 }, () => gerarCodigo()));
    expect(vistos.size).toBeGreaterThan(990);
  });

  it('é determinístico quando o sorteio é', () => {
    const fixo = () => 0;
    expect(gerarCodigo(fixo)).toBe('AAAA');
  });
});

describe('esquemaIntencao', () => {
  const valida = {
    marca: 'haubert',
    codigo: 'K7QP',
    pessoas: 4,
    quando: 'hoje',
    canal: 'whatsapp' as const,
    origem: 'barra',
  };

  it('aceita o que o botão manda', () => {
    expect(esquemaIntencao.safeParse(valida).success).toBe(true);
  });

  it('recusa canal inventado', () => {
    expect(esquemaIntencao.safeParse({ ...valida, canal: 'pombo' }).success).toBe(false);
  });

  it('recusa código fora do formato', () => {
    expect(esquemaIntencao.safeParse({ ...valida, codigo: 'k7qp' }).success).toBe(false);
    expect(esquemaIntencao.safeParse({ ...valida, codigo: 'K7QPX' }).success).toBe(false);
  });

  it('recusa grupo fora da faixa da casa', () => {
    expect(esquemaIntencao.safeParse({ ...valida, pessoas: 0 }).success).toBe(false);
    expect(esquemaIntencao.safeParse({ ...valida, pessoas: 31 }).success).toBe(false);
    expect(esquemaIntencao.safeParse({ ...valida, pessoas: 2.5 }).success).toBe(false);
  });

  it('recusa campo de texto gigante, que é como se enche tabela de graça', () => {
    expect(esquemaIntencao.safeParse({ ...valida, origem: 'x'.repeat(500) }).success).toBe(false);
    expect(esquemaIntencao.safeParse({ ...valida, quando: 'x'.repeat(500) }).success).toBe(false);
  });

  it('aceita "quando" vazio, que é o caso de "outro dia"', () => {
    const r = esquemaIntencao.safeParse({ ...valida, quando: '' });
    expect(r.success).toBe(true);
  });
});

describe('resumir', () => {
  const agora = new Date('2026-09-01T20:00:00Z');
  const em = (iso: string, extra: Partial<IntencaoRegistrada> = {}): IntencaoRegistrada => ({
    id: iso,
    marca: 'haubert',
    codigo: 'ABCD',
    pessoas: 2,
    quando: 'hoje',
    canal: 'whatsapp',
    origem: 'barra',
    criadoEm: iso,
    ...extra,
  });

  it('conta hoje, sete dias e o total', () => {
    const r = resumir(
      [
        em('2026-09-01T19:00:00Z'),
        em('2026-09-01T08:00:00Z'),
        em('2026-08-30T12:00:00Z'),
        em('2026-08-01T12:00:00Z'),
      ],
      agora,
    );
    expect(r.total).toBe(4);
    expect(r.hoje).toBe(2);
    expect(r.seteDias).toBe(3);
  });

  it('tira a média de pessoas com uma casa decimal', () => {
    const r = resumir(
      [em('2026-09-01T19:00:00Z', { pessoas: 2 }), em('2026-09-01T19:05:00Z', { pessoas: 5 })],
      agora,
    );
    expect(r.mediaPessoas).toBe(3.5);
  });

  it('separa por canal e por marca', () => {
    const r = resumir(
      [
        em('2026-09-01T19:00:00Z', { canal: 'whatsapp', marca: 'haubert' }),
        em('2026-09-01T19:01:00Z', { canal: 'instagram', marca: 'casa' }),
        em('2026-09-01T19:02:00Z', { canal: 'instagram', marca: 'casa' }),
      ],
      agora,
    );
    expect(r.porCanal).toEqual({ whatsapp: 1, instagram: 2 });
    expect(r.porMarca).toEqual({ haubert: 1, casa: 2 });
  });

  it('não divide por zero na lista vazia', () => {
    const r = resumir([], agora);
    expect(r).toEqual({ total: 0, hoje: 0, seteDias: 0, mediaPessoas: 0, porCanal: {}, porMarca: {} });
  });
});
