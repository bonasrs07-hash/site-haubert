/**
 * Preço é a parte do cardápio que não pode errar: o número na tela é o número
 * que o cliente vai conferir na conta. Estas duas funções são a fronteira
 * entre o que o dono digita e o que o banco guarda, e o schema exige inteiro
 * em centavos, nunca float. (supabase/schema.sql)
 */
import { describe, expect, it } from 'vitest';
import { ehPadrao, formatarPreco, lerPreco } from './cardapio';

describe('lerPreco', () => {
  it('entende os jeitos que uma pessoa escreve preço', () => {
    expect(lerPreco('89')).toBe(8900);
    expect(lerPreco('89,90')).toBe(8990);
    expect(lerPreco('89.90')).toBe(8990);
    expect(lerPreco('R$ 89,90')).toBe(8990);
    expect(lerPreco('  129,00  ')).toBe(12900);
  });

  it('desempata o ponto, que é milhar ou decimal conforme o que vem depois', () => {
    expect(lerPreco('1.299,90')).toBe(129990); // vírgula manda: ponto é milhar
    expect(lerPreco('1.299')).toBe(129900); // 3 dígitos depois: milhar
    expect(lerPreco('89.90')).toBe(8990); // 2 dígitos depois: decimal
    expect(lerPreco('89.9')).toBe(8990); // 1 dígito depois: decimal
    expect(lerPreco('1.299.900')).toBe(129990000); // dois pontos: tudo milhar
  });

  it('trata vazio como "preço não divulgado", não como erro', () => {
    // A diferença importa: null some da tela, undefined vira mensagem de erro.
    expect(lerPreco('')).toBeNull();
    expect(lerPreco('   ')).toBeNull();
  });

  it('recusa o que não é preço, em vez de adivinhar', () => {
    expect(lerPreco('a combinar')).toBeUndefined();
    expect(lerPreco('89,9,9')).toBeUndefined();
    expect(lerPreco('-10')).toBeUndefined();
    expect(lerPreco('89,999')).toBeUndefined();
  });

  it('nunca devolve centavo fracionado', () => {
    const r = lerPreco('89,90');
    expect(Number.isInteger(r)).toBe(true);
  });
});

describe('formatarPreco', () => {
  it('mostra em real', () => {
    expect(formatarPreco(8990)?.replace(/ /g, ' ')).toBe('R$ 89,90');
    expect(formatarPreco(12900)?.replace(/ /g, ' ')).toBe('R$ 129,00');
  });

  it('não inventa preço quando não há', () => {
    expect(formatarPreco(null)).toBeNull();
  });

  it('vai e volta sem perder centavo', () => {
    for (const escrito of ['0,01', '7,50', '89,90', '1.299,90']) {
      const cents = lerPreco(escrito) as number;
      const devolta = lerPreco(formatarPreco(cents)!.replace(/ /g, ' '));
      expect(devolta).toBe(cents);
    }
  });
});

describe('ehPadrao', () => {
  it('reconhece o piso, que é o que dispara o aviso honesto na página', () => {
    expect(ehPadrao([{ id: 'padrao-cortes', nome: '', descricao: '', publicado: true, ordem: 0, itens: [] }])).toBe(true);
  });

  it('não confunde cardápio de verdade com o piso', () => {
    expect(ehPadrao([{ id: 'uuid-real', nome: 'Cafés', descricao: '', publicado: true, ordem: 0, itens: [] }])).toBe(false);
    expect(ehPadrao([])).toBe(false);
  });
});
