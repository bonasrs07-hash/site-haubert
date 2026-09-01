/**
 * Apresentação de texto, em especial o que ainda não veio do cliente.
 *
 * O marcador PENDENTE existe para o time, não para o visitante: ele NUNCA
 * chega à tela. Onde falta dado, a página mostra o que é verdade ou não mostra
 * nada, jamais um campo vazio nem um placeholder inventado. (F-006, RN-43)
 */
import { PENDENTE, ehPendente } from './tipos';

export { PENDENTE, ehPendente };

/** Remove o marcador e sobra do espaçamento. */
export function limparPendente(valor: string): string {
  return valor.split(PENDENTE).join('').replace(/\s{2,}/g, ' ').trim();
}

/** O valor, se for real; senão a alternativa honesta. */
export function ouEntao(valor: string | null | undefined, alternativa: string): string {
  if (!valor) return alternativa;
  const limpo = limparPendente(valor);
  return limpo.length > 0 ? limpo : alternativa;
}

/** Há dado real aqui? Usado para decidir se a seção sequer é renderizada. */
export function temValor(valor: string | null | undefined): boolean {
  return Boolean(valor) && !ehPendente(valor as string) && (valor as string).trim().length > 0;
}
