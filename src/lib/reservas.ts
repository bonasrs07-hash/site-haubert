/**
 * Camada de serviços, reserva.
 *
 * Fase 1: a reserva termina no WhatsApp, no canal que a equipe já usa. O site
 * NÃO coleta e NÃO armazena dado pessoal. (ADR-005)
 *
 * Fase 3: `enviarReserva()` passa a chamar POST /api/reserva com validação Zod
 * e rate limit no servidor. O link de WhatsApp continua como fallback.
 */
import type { Marca } from './tipos';

/**
 * O mínimo que a reserva precisa saber da marca.
 *
 * Existe para que o script do cliente carregue três strings em vez do objeto
 * inteiro, o que vai para o HTML é o que o visitante baixa. `Marca` satisfaz
 * este shape, então nada precisa converter.
 */
export type MarcaResumo = Pick<Marca, 'slug' | 'nomeCurto' | 'instagramUrl'>;

export interface EscolhaReserva {
  pessoas: number;
  quando: string; // rótulo humano: 'hoje', 'amanhã', 'sexta às 20h'
}

/**
 * Codigo curto que casa a conversa do WhatsApp com a linha do painel.
 *
 * Mora AQUI e nao em `intencoes.ts` por uma razao de bundle: aquele arquivo
 * importa Zod e o cliente Supabase, e o script do botao roda no browser.
 * Import de servidor em modulo de cliente e como codigo de servidor vaza.
 *
 * Alfabeto sem os pares que se confundem lidos em voz alta: O/0, I/1, S/5.
 * O codigo e ditado no balcao, nao copiado e colado.
 */
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
export const TAMANHO_CODIGO = 4;
export const FORMATO_CODIGO = /^[A-Z0-9]{4}$/;

export function gerarCodigo(sortear: () => number = Math.random): string {
  let saida = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    saida += ALFABETO_CODIGO[Math.floor(sortear() * ALFABETO_CODIGO.length)];
  }
  return saida;
}

/** Grupo entre 1 e 30. Acima disso o fluxo vira contato de eventos. (RN-34) */
export const MIN_PESSOAS = 1;
export const MAX_PESSOAS = 30;
export const OPCOES_PESSOAS = [2, 4, 6, 8] as const;

export function limitarPessoas(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.min(MAX_PESSOAS, Math.max(MIN_PESSOAS, Math.round(n)));
}

/**
 * Mensagem pré-preenchida, no tom da marca do modo ativo. (RN-33)
 * Ex.: "Oi! Queria reservar uma mesa no HAUBERT para 4 pessoas, sexta às 20h."
 *
 * O `codigo` é o que costura a conversa ao registro do painel: a equipe lê
 * "reserva K7QP" e acha a linha. Vem opcional de propósito — sem JavaScript
 * não há código, e a mensagem tem que continuar fazendo sentido sozinha.
 */
export function montarMensagem(
  marca: MarcaResumo,
  escolha: EscolhaReserva,
  codigo?: string,
): string {
  const pessoas = limitarPessoas(escolha.pessoas);
  const plural = pessoas === 1 ? 'pessoa' : 'pessoas';
  const quando = escolha.quando.trim();
  const fim = quando ? `, ${quando}` : '';
  const marcador = codigo ? ` (reserva ${codigo})` : '';
  return `Oi! Queria reservar uma mesa no ${marca.nomeCurto} para ${pessoas} ${plural}${fim}.${marcador}`;
}

/** Só dígitos, o wa.me não aceita '+', espaço nem parêntese. */
export function normalizarNumero(numero: string): string {
  return numero.replace(/\D/g, '');
}

export function temWhatsapp(numero: string): boolean {
  return normalizarNumero(numero).length >= 12;
}

/**
 * Deep link do WhatsApp com UTM, o clique é a métrica de conversão da Fase 1.
 * Sem número configurado devolve `null`, e a UI degrada para telefone. (RN-37)
 */
export function montarLinkWhatsapp(
  numero: string,
  marca: MarcaResumo,
  escolha: EscolhaReserva,
  origem = 'site',
  codigo?: string,
): string | null {
  const limpo = normalizarNumero(numero);
  if (!temWhatsapp(limpo)) return null;

  // encodeURIComponent, não URLSearchParams: o segundo codifica espaço como
  // '+', e cabe a quem lê decidir se '+' é espaço ou sinal de mais. O cliente
  // do WhatsApp não é nosso, '%20' não depende da interpretação de ninguém.
  const texto = encodeURIComponent(montarMensagem(marca, escolha, codigo));
  const utm = `utm_source=${origem}&utm_medium=reserva&utm_campaign=${marca.slug}`;
  return `https://wa.me/${limpo}?text=${texto}#${utm}`;
}

/** Link de telefone, o degradê quando não há WhatsApp. */
export function montarLinkTelefone(telefone: string): string | null {
  const limpo = normalizarNumero(telefone);
  return limpo.length >= 10 ? `tel:+${limpo}` : null;
}

/**
 * O melhor caminho de reserva disponível AGORA, na ordem em que a equipe
 * responde mais rápido. Nunca devolve `null`: o Instagram é o piso, e é onde a
 * casa já vive (16,3 mil + 6,3 mil seguidores). (F-006)
 */
export function melhorCanal(
  marca: MarcaResumo,
  escolha: EscolhaReserva,
  contatos: { whatsapp?: string; telefone?: string },
  origem = 'site',
  codigo?: string,
): { tipo: 'whatsapp' | 'telefone' | 'instagram'; href: string; rotulo: string } {
  const zap = contatos.whatsapp
    ? montarLinkWhatsapp(contatos.whatsapp, marca, escolha, origem, codigo)
    : null;
  if (zap) return { tipo: 'whatsapp', href: zap, rotulo: 'Abrir no WhatsApp' };

  const tel = contatos.telefone ? montarLinkTelefone(contatos.telefone) : null;
  if (tel) return { tipo: 'telefone', href: tel, rotulo: 'Ligar para a casa' };

  return { tipo: 'instagram', href: marca.instagramUrl, rotulo: 'Chamar no Instagram' };
}
