/**
 * Freio de tentativas de login.
 *
 * HONESTIDADE SOBRE O QUE ISTO É: uma trava EM MEMÓRIA, por instância. Na
 * Vercel cada requisição pode cair numa instância diferente e cada instância
 * começa com o contador zerado, então isto atrasa um ataque, não o impede.
 *
 * Está aqui mesmo assim porque a alternativa (nada) é pior, e porque o painel
 * tem exatamente uma conta: um alvo conhecido e único é o cenário em que força
 * bruta compensa. A defesa que de fato conta é o limite do próprio Supabase
 * Auth, do lado do servidor de autenticação, mais uma senha longa.
 *
 * Se um dia isto precisar valer de verdade, o lugar é o banco, como já é o
 * freio de publicação (`ultima_publicacao_em`). Está escrito no ADR-008 para
 * ninguém confundir esta função com proteção completa.
 */

const JANELA_MS = 15 * 60 * 1000;
const TENTATIVAS_NA_JANELA = 8;

/**
 * Cada uso tem o SEU balde. Sem isto, alguem tocando no botao de reserva
 * varias vezes gastaria as tentativas de login do dono, que sai da mesma
 * casa e do mesmo IP.
 */
export type Balde = 'login' | 'intencao';

const LIMITES: Record<Balde, { janelaMs: number; teto: number }> = {
  login: { janelaMs: JANELA_MS, teto: TENTATIVAS_NA_JANELA },
  // Intencao e barata e legitima em rajada (a pessoa muda de ideia sobre
  // quantas pessoas). O teto existe contra script, nao contra gente.
  intencao: { janelaMs: 60 * 1000, teto: 20 },
};

interface Registro {
  contagem: number;
  reiniciaEm: number;
}

const porOrigem = new Map<string, Registro>();

export interface Veredito {
  permitido: boolean;
  /** Quanto falta para poder tentar de novo. */
  segundos: number;
}

export function registrarTentativa(
  origem: string,
  balde: Balde = 'login',
  agora = Date.now(),
): Veredito {
  const limite = LIMITES[balde];
  const chaveDoBalde = balde + ':' + origem;
  // Poda oportunista: sem isto o mapa cresce para sempre numa instância viva.
  for (const [chave, reg] of porOrigem) {
    if (reg.reiniciaEm <= agora) porOrigem.delete(chave);
  }

  const atual = porOrigem.get(chaveDoBalde);
  if (!atual || atual.reiniciaEm <= agora) {
    porOrigem.set(chaveDoBalde, { contagem: 1, reiniciaEm: agora + limite.janelaMs });
    return { permitido: true, segundos: 0 };
  }

  atual.contagem += 1;
  if (atual.contagem > limite.teto) {
    return { permitido: false, segundos: Math.ceil((atual.reiniciaEm - agora) / 1000) };
  }
  return { permitido: true, segundos: 0 };
}

/** Só para o teste: a memória é global e um caso não pode sujar o outro. */
export function limparFreio(): void {
  porOrigem.clear();
}
