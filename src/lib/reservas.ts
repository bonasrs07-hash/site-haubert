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
 */
export function montarMensagem(marca: MarcaResumo, escolha: EscolhaReserva): string {
  const pessoas = limitarPessoas(escolha.pessoas);
  const plural = pessoas === 1 ? 'pessoa' : 'pessoas';
  const quando = escolha.quando.trim();
  const fim = quando ? `, ${quando}` : '';
  return `Oi! Queria reservar uma mesa no ${marca.nomeCurto} para ${pessoas} ${plural}${fim}.`;
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
): string | null {
  const limpo = normalizarNumero(numero);
  if (!temWhatsapp(limpo)) return null;

  // encodeURIComponent, não URLSearchParams: o segundo codifica espaço como
  // '+', e cabe a quem lê decidir se '+' é espaço ou sinal de mais. O cliente
  // do WhatsApp não é nosso, '%20' não depende da interpretação de ninguém.
  const texto = encodeURIComponent(montarMensagem(marca, escolha));
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
): { tipo: 'whatsapp' | 'telefone' | 'instagram'; href: string; rotulo: string } {
  const zap = contatos.whatsapp ? montarLinkWhatsapp(contatos.whatsapp, marca, escolha, origem) : null;
  if (zap) return { tipo: 'whatsapp', href: zap, rotulo: 'Abrir no WhatsApp' };

  const tel = contatos.telefone ? montarLinkTelefone(contatos.telefone) : null;
  if (tel) return { tipo: 'telefone', href: tel, rotulo: 'Ligar para a casa' };

  return { tipo: 'instagram', href: marca.instagramUrl, rotulo: 'Chamar no Instagram' };
}
