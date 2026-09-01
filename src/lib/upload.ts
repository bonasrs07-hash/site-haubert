/**
 * Validação de arquivo enviado no painel. (docs/11_SEGURANCA, ADR-008)
 *
 * Funções puras, sem rede e sem banco, por isso nascem com teste.
 *
 * A postura: **nada do que o cliente afirma sobre o arquivo é aceito.** Nem o
 * nome, nem o `Content-Type` do multipart, nem a largura que a ilha React
 * mandou junto. Os bytes é que dizem o que o arquivo é, e as dimensões são
 * lidas do cabeçalho do próprio WebP. Um `Content-Type: image/webp` num
 * arquivo que é outra coisa é a forma mais barata de tentar guardar coisa
 * errada num bucket.
 *
 * Só WebP entra: a ilha converte no browser antes de enviar. Isso não é
 * capricho de formato, o `canvas` re-codifica a imagem e, ao fazer isso,
 * **descarta o EXIF**, que é onde mora a coordenada de GPS da foto tirada no
 * celular. Aceitar o JPEG cru significaria guardar a localização de quem
 * fotografou, sem necessidade nenhuma.
 */

/**
 * Teto do master. O número não é gosto: a função serverless da Vercel recusa
 * corpo de requisição acima de ~4,5 MB, e recusa ANTES do nosso código rodar,
 * o dono veria um erro de plataforma sem explicação. Melhor barrar aqui, com
 * frase em português, num limite que a ilha já respeita: ela reencoda para
 * WebP com no máximo 2400px, o que costuma dar menos de 600 KB.
 */
export const BYTES_MAXIMOS = 4 * 1024 * 1024;

/** Abaixo disto a foto não serve nem para cartão. (ADR-007 explica o porquê) */
export const LARGURA_MINIMA = 480;

export interface DimensoesWebp {
  largura: number;
  altura: number;
}

export type ResultadoValidacao =
  | { ok: true; dimensoes: DimensoesWebp }
  | { ok: false; erro: string };

const texto = (bytes: Uint8Array, inicio: number, fim: number) =>
  String.fromCharCode(...bytes.slice(inicio, fim));

/**
 * Dimensões a partir do cabeçalho WebP. `null` quando não é um WebP válido.
 *
 * O formato tem três variantes e cada uma guarda o tamanho num lugar
 * diferente; o `canvas` costuma produzir a primeira, mas as outras existem e
 * um arquivo que chega por upload não tem obrigação de ser o caso comum.
 */
export function dimensoesDoWebp(bytes: Uint8Array): DimensoesWebp | null {
  if (bytes.length < 30) return null;
  if (texto(bytes, 0, 4) !== 'RIFF' || texto(bytes, 8, 12) !== 'WEBP') return null;

  const formato = texto(bytes, 12, 16);

  // VP8 (com perda): quadro-chave, dimensões em 14 bits a partir do byte 26.
  if (formato === 'VP8 ') {
    const largura = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
    const altura = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
    return largura > 0 && altura > 0 ? { largura, altura } : null;
  }

  // VP8L (sem perda): 14 bits de largura e 14 de altura, empacotados, menos 1.
  if (formato === 'VP8L') {
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    const b = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const largura = (b & 0x3fff) + 1;
    const altura = ((b >> 14) & 0x3fff) + 1;
    return { largura, altura };
  }

  // VP8X (estendido): 24 bits de cada, little-endian, também menos 1.
  if (formato === 'VP8X') {
    if (bytes.length < 30) return null;
    const largura = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
    const altura = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
    return { largura, altura };
  }

  return null;
}

/** O arquivo pode virar foto do site? */
export function validarEnvio(bytes: Uint8Array): ResultadoValidacao {
  if (bytes.length === 0) return { ok: false, erro: 'O arquivo chegou vazio.' };
  if (bytes.length > BYTES_MAXIMOS) {
    const mb = (BYTES_MAXIMOS / 1024 / 1024).toFixed(0);
    return { ok: false, erro: `A imagem passou de ${mb} MB.` };
  }

  const dimensoes = dimensoesDoWebp(bytes);
  if (!dimensoes) {
    return { ok: false, erro: 'O arquivo não é uma imagem válida.' };
  }
  if (dimensoes.largura < LARGURA_MINIMA) {
    return {
      ok: false,
      erro: `A imagem tem ${dimensoes.largura}px de largura. O mínimo é ${LARGURA_MINIMA}px, abaixo disso ela sai borrada no site.`,
    };
  }
  return { ok: true, dimensoes };
}

/**
 * Caminho do arquivo no Storage.
 *
 * O primeiro segmento é o slug da casa porque é ele que a policy do Storage
 * lê para saber de quem é o arquivo (`casa_do_caminho`). O resto é data e um
 * identificador aleatório, nome de arquivo enviado pelo usuário nunca vira
 * caminho: é assim que se escreve por cima do arquivo dos outros.
 */
export function montarCaminho(casaSlug: string, id: string, agora: Date): string {
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, '0');
  return `${casaSlug}/${ano}/${mes}/${id}.webp`;
}

/** Nome legível na galeria, a partir do que o dono enviou. Sem caminho, sem HTML. */
export function limparNome(bruto: unknown): string {
  if (typeof bruto !== 'string') return 'Sem nome';
  const so = bruto
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[<>&"'`]/g, '')
    .trim();
  return so.slice(0, 80) || 'Sem nome';
}
