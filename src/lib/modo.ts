/**
 * Modo Dia/Noite no cliente.
 *
 * A regra de qual modo mostrar vive em três lugares, de propósito:
 *   - script inline do <head>  → antes da primeira pintura (anti-FOUC)
 *   - src/lib/casa.ts          → a mesma regra, para o servidor
 *   - este arquivo             → a troca depois que a página já existe
 * (ADR-004)
 */
import type { Modo } from './tipos';

export const CHAVE_MODO = 'casa-modo';

export function ehModo(valor: unknown): valor is Modo {
  return valor === 'dia' || valor === 'noite';
}

/** O modo pintado agora. Fora do browser, o padrão do servidor. */
export function lerModo(): Modo {
  if (typeof document === 'undefined') return 'dia';
  const atual = document.documentElement.getAttribute('data-modo');
  return ehModo(atual) ? atual : 'dia';
}

/**
 * Aplica e memoriza. A escolha manual vence a hora até o visitante mudar de
 * ideia — o site nunca reescreve por conta própria. (RN-03)
 */
export function definirModo(modo: Modo): void {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement;
  raiz.setAttribute('data-modo', modo);
  // Rota que força um modo deixa de forçar assim que o visitante escolhe.
  raiz.removeAttribute('data-modo-forcado');
  try {
    window.localStorage.setItem(CHAVE_MODO, modo);
  } catch {
    // Storage bloqueado (aba anônima): a troca vale para esta navegação.
  }
}

export function alternarModo(): Modo {
  const proximo: Modo = lerModo() === 'noite' ? 'dia' : 'noite';
  definirModo(proximo);
  return proximo;
}
