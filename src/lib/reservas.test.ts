import { describe, expect, it } from 'vitest';
import {
  limitarPessoas,
  melhorCanal,
  montarLinkTelefone,
  montarLinkWhatsapp,
  montarMensagem,
  normalizarNumero,
  temWhatsapp,
  type MarcaResumo,
} from './reservas';

const HAUBERT: MarcaResumo = {
  slug: 'haubert',
  nomeCurto: 'HAUBERT',
  instagramUrl: 'https://instagram.com/haubert.steakhouse',
};

const CASA: MarcaResumo = {
  slug: 'casa',
  nomeCurto: 'CASA',
  instagramUrl: 'https://instagram.com/casa.coffee',
};

describe('limitarPessoas', () => {
  it('mantém valores dentro da faixa', () => {
    expect(limitarPessoas(4)).toBe(4);
    expect(limitarPessoas(30)).toBe(30);
  });

  it('trava nos extremos em vez de aceitar absurdo', () => {
    expect(limitarPessoas(0)).toBe(1);
    expect(limitarPessoas(-5)).toBe(1);
    expect(limitarPessoas(999)).toBe(30);
  });

  it('cai em 2 diante de qualquer valor não finito', () => {
    // Infinity não é "muita gente", é lixo. Virar 30 daria a um valor
    // corrompido a aparência de escolha deliberada.
    expect(limitarPessoas(Number.NaN)).toBe(2);
    expect(limitarPessoas(Number.POSITIVE_INFINITY)).toBe(2);
    expect(limitarPessoas(Number.NEGATIVE_INFINITY)).toBe(2);
  });
});

describe('montarMensagem', () => {
  it('usa o nome curto da marca do modo ativo', () => {
    expect(montarMensagem(HAUBERT, { pessoas: 4, quando: 'sexta às 20h' })).toBe(
      'Oi! Queria reservar uma mesa no HAUBERT para 4 pessoas, sexta às 20h.',
    );
  });

  it('concorda o plural com 1 pessoa', () => {
    expect(montarMensagem(CASA, { pessoas: 1, quando: 'hoje' })).toBe(
      'Oi! Queria reservar uma mesa no CASA para 1 pessoa, hoje.',
    );
  });

  it('omite o "quando" quando o visitante escolheu Outro dia', () => {
    expect(montarMensagem(CASA, { pessoas: 2, quando: '' })).toBe(
      'Oi! Queria reservar uma mesa no CASA para 2 pessoas.',
    );
  });
});

describe('normalizarNumero e temWhatsapp', () => {
  it('descarta tudo que não é dígito', () => {
    expect(normalizarNumero('+55 (51) 99999-0000')).toBe('5551999990000');
  });

  it('exige DDI + DDD + número para considerar válido', () => {
    expect(temWhatsapp('+55 51 99999-0000')).toBe(true);
    expect(temWhatsapp('99999-0000')).toBe(false);
    expect(temWhatsapp('')).toBe(false);
  });
});

describe('montarLinkWhatsapp', () => {
  it('monta o deep link com mensagem e UTM', () => {
    const link = montarLinkWhatsapp('+55 51 99999-0000', HAUBERT, { pessoas: 6, quando: 'hoje' }, 'barra');
    expect(link).not.toBeNull();
    const url = new URL(link as string);
    expect(url.origin + url.pathname).toBe('https://wa.me/5551999990000');
    expect(url.searchParams.get('text')).toBe(
      'Oi! Queria reservar uma mesa no HAUBERT para 6 pessoas, hoje.',
    );
    expect(url.hash).toContain('utm_source=barra');
    expect(url.hash).toContain('utm_campaign=haubert');
  });

  it('codifica espaço como %20, nunca como +', () => {
    // Um cliente que não trate '+' como espaço entregaria a mensagem cheia de
    // sinais de mais. %20 não tem essa ambiguidade.
    const link = montarLinkWhatsapp('+5551999990000', CASA, { pessoas: 2, quando: 'hoje' });
    expect(link).toContain('%20');
    expect(link?.split('#')[0]).not.toContain('+');
  });

  it('devolve null com número inválido, para a UI degradar', () => {
    expect(montarLinkWhatsapp('123', HAUBERT, { pessoas: 2, quando: 'hoje' })).toBeNull();
    expect(montarLinkWhatsapp('', HAUBERT, { pessoas: 2, quando: 'hoje' })).toBeNull();
  });
});

describe('montarLinkTelefone', () => {
  it('monta tel: com o número limpo', () => {
    expect(montarLinkTelefone('(51) 3333-4444')).toBe('tel:+5133334444');
  });

  it('recusa número curto demais', () => {
    expect(montarLinkTelefone('3333')).toBeNull();
  });
});

describe('melhorCanal', () => {
  const escolha = { pessoas: 4, quando: 'hoje' };

  it('prefere WhatsApp quando existe', () => {
    const canal = melhorCanal(HAUBERT, escolha, {
      whatsapp: '+5551999990000',
      telefone: '5133334444',
    });
    expect(canal.tipo).toBe('whatsapp');
    expect(canal.href).toContain('wa.me');
  });

  it('cai para telefone quando não há WhatsApp', () => {
    const canal = melhorCanal(HAUBERT, escolha, { telefone: '5133334444' });
    expect(canal.tipo).toBe('telefone');
    expect(canal.href).toBe('tel:+5133334444');
  });

  it('nunca devolve nulo: sem contato nenhum, sobra o Instagram', () => {
    // É o estado real da Fase 1 enquanto BLK-005 não fecha. A casa vive no
    // Instagram; mandar o visitante para lá é honesto e funciona hoje. (F-006)
    const canal = melhorCanal(HAUBERT, escolha, {});
    expect(canal.tipo).toBe('instagram');
    expect(canal.href).toBe(HAUBERT.instagramUrl);
    expect(canal.rotulo).toBe('Chamar no Instagram');
  });

  it('segue a marca do modo ativo, não uma marca fixa', () => {
    const noite = melhorCanal(HAUBERT, escolha, { whatsapp: '+5551999990000' });
    const dia = melhorCanal(CASA, escolha, { whatsapp: '+5551999990000' });
    const texto = (href: string) => new URL(href).searchParams.get('text') ?? '';
    expect(texto(noite.href)).toContain('no HAUBERT');
    expect(texto(dia.href)).toContain('no CASA');
  });
});
