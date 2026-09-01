/**
 * O parser de cabeçalho WebP é a barreira que decide o que entra no acervo.
 * Se ele aceitar lixo, o build quebra com uma imagem que não existe; se ele
 * errar a dimensão, o site ganha salto de layout. Por isso ele é testado
 * contra arquivo de verdade, e não só contra bytes que eu mesmo montei.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BYTES_MAXIMOS,
  LARGURA_MINIMA,
  dimensoesDoWebp,
  limparNome,
  montarCaminho,
  validarEnvio,
} from './upload';

/** Cabeçalho VP8 com perda — o que o `canvas` do browser produz. */
function webpVP8(largura: number, altura: number): Uint8Array {
  const b = new Uint8Array(40);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
  b.set([...'VP8 '].map((c) => c.charCodeAt(0)), 12);
  b.set([0x9d, 0x01, 0x2a], 23);
  b[26] = largura & 0xff;
  b[27] = (largura >> 8) & 0x3f;
  b[28] = altura & 0xff;
  b[29] = (altura >> 8) & 0x3f;
  return b;
}

describe('dimensoesDoWebp', () => {
  it('lê o tamanho de um WebP real do acervo', () => {
    const bytes = new Uint8Array(readFileSync('src/assets/marca/brinde-tacas.webp'));
    expect(dimensoesDoWebp(bytes)).toEqual({ largura: 245, altura: 327 });
  });

  it('lê outro arquivo real, com outra largura', () => {
    const bytes = new Uint8Array(readFileSync('src/assets/marca/dj-cultura.webp'));
    expect(dimensoesDoWebp(bytes)).toEqual({ largura: 262, altura: 327 });
  });

  it('lê a variante VP8 montada à mão', () => {
    expect(dimensoesDoWebp(webpVP8(1920, 1080))).toEqual({ largura: 1920, altura: 1080 });
  });

  it('recusa arquivo que não é WebP', () => {
    const jpeg = new Uint8Array(40);
    jpeg.set([0xff, 0xd8, 0xff, 0xe0], 0);
    expect(dimensoesDoWebp(jpeg)).toBeNull();
  });

  it('recusa RIFF que não é WEBP', () => {
    const wav = new Uint8Array(40);
    wav.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
    wav.set([...'WAVE'].map((c) => c.charCodeAt(0)), 8);
    expect(dimensoesDoWebp(wav)).toBeNull();
  });

  it('recusa arquivo curto demais para ter cabeçalho', () => {
    expect(dimensoesDoWebp(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });
});

describe('validarEnvio', () => {
  it('aceita uma imagem grande o suficiente', () => {
    const r = validarEnvio(webpVP8(1600, 1200));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dimensoes.largura).toBe(1600);
  });

  it('recusa imagem estreita demais, dizendo o número', () => {
    const r = validarEnvio(webpVP8(320, 240));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro).toContain('320px');
      expect(r.erro).toContain(String(LARGURA_MINIMA));
    }
  });

  it('recusa arquivo vazio', () => {
    expect(validarEnvio(new Uint8Array(0)).ok).toBe(false);
  });

  it('recusa arquivo acima do teto de bytes', () => {
    // Cabeçalho válido, corpo gigante: o teto tem que valer mesmo quando a
    // imagem é legítima.
    const grande = new Uint8Array(BYTES_MAXIMOS + 1);
    grande.set(webpVP8(1600, 1200), 0);
    expect(validarEnvio(grande).ok).toBe(false);
  });

  it('recusa arquivo que só finge ser imagem', () => {
    const texto = new TextEncoder().encode('<?php system($_GET["c"]); ?>'.repeat(4));
    expect(validarEnvio(texto).ok).toBe(false);
  });
});

describe('montarCaminho', () => {
  it('começa pelo slug da casa — é o que a policy do Storage lê', () => {
    const caminho = montarCaminho('casa-haubert', 'abc123', new Date('2026-08-29T12:00:00Z'));
    expect(caminho).toBe('casa-haubert/2026/08/abc123.webp');
    expect(caminho.split('/')[0]).toBe('casa-haubert');
  });

  it('zera o mês à esquerda', () => {
    expect(montarCaminho('x', 'i', new Date('2026-01-05T00:00:00Z'))).toBe('x/2026/01/i.webp');
  });
});

describe('limparNome', () => {
  it('tira caminho e extensão', () => {
    expect(limparNome('C:\\fotos\\salao noturno.JPG')).toBe('salao noturno');
    expect(limparNome('/tmp/brasa.webp')).toBe('brasa');
  });

  it('remove o que viraria HTML na galeria', () => {
    expect(limparNome('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
  });

  it('não estoura o tamanho do campo', () => {
    expect(limparNome('a'.repeat(500)).length).toBe(80);
  });

  it('cai num nome honesto quando não veio nada', () => {
    expect(limparNome(undefined)).toBe('Sem nome');
    expect(limparNome('   ')).toBe('Sem nome');
  });
});
