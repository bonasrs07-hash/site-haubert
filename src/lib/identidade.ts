/**
 * Leitura e escrita da identidade da casa, pelo painel. (P-001)
 *
 * Separado de `casa.ts` de propósito, e a diferença importa: `casa.ts` lê com
 * a `service_role` no BUILD e guarda em cache, porque a home chama a mesma
 * coisa em seis componentes. Se o painel lesse por lá, o dono salvaria o
 * endereço, recarregaria e continuaria vendo o antigo.
 *
 * Aqui é sempre leitura fresca, com o token do DONO: quem autoriza é a RLS.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ehListaDeFaixas, formatarHorario } from './horario-texto';
import type { FaixaHorario } from './tipos';

export interface MarcaEditavel {
  slug: string;
  nome: string;
  nomeCurto: string;
  instagram: string;
  horario: FaixaHorario[];
  /** Derivado das faixas, só para a tela conferir o que vai sair. */
  horarioLegivel: string;
}

export interface CasaEditavel {
  nome: string;
  cidade: string;
  uf: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  marcas: MarcaEditavel[];
}

export type Resultado = { ok: true } | { ok: false; erro: string; status: number };
const naoDeu = (erro: string, status = 400): Resultado => ({ ok: false, erro, status });

/** Texto do dono: aparado, com teto, sem os sinais que viram tag na página. */
function texto(bruto: unknown, max: number): string {
  if (typeof bruto !== 'string') return '';
  return bruto.replace(/[<>]/g, '').trim().slice(0, max);
}

export async function lerCasa(
  supabase: SupabaseClient,
  casaId: string,
): Promise<CasaEditavel | null> {
  const { data: casa } = await supabase
    .from('venues')
    .select('nome, cidade, uf, endereco, telefone, whatsapp')
    .eq('id', casaId)
    .maybeSingle();
  if (!casa) return null;

  const { data: marcas } = await supabase
    .from('brands')
    .select('slug, nome, instagram, horario, ordem')
    .eq('venue_id', casaId)
    .order('ordem');

  return {
    nome: casa.nome ?? '',
    cidade: casa.cidade ?? '',
    uf: casa.uf ?? '',
    endereco: casa.endereco ?? '',
    telefone: casa.telefone ?? '',
    whatsapp: casa.whatsapp ?? '',
    marcas: (marcas ?? []).map((m) => {
      const horario = ehListaDeFaixas(m.horario) ? m.horario : [];
      return {
        slug: m.slug,
        nome: m.nome ?? '',
        nomeCurto: (m.nome ?? '').split(' ')[0] || m.slug,
        instagram: m.instagram ?? '',
        horario,
        horarioLegivel: formatarHorario(horario),
      };
    }),
  };
}

/**
 * Salva endereço, telefone e WhatsApp.
 *
 * O WhatsApp aqui é o que destrava BLK-005: com ele preenchido, o CTA de
 * reserva para de cair no Instagram e passa a abrir a conversa com a mensagem
 * pronta, que é o que o ADR-005 desenhou.
 */
export async function salvarContato(
  supabase: SupabaseClient,
  casaId: string,
  entrada: { endereco: unknown; telefone: unknown; whatsapp: unknown },
): Promise<Resultado> {
  const whatsapp = texto(entrada.whatsapp, 20);
  // Só dígitos e o '+'. Um número com letra vira link de WhatsApp quebrado, e
  // o erro só aparece quando um cliente clica.
  if (whatsapp && !/^\+?[0-9\s()-]{10,20}$/.test(whatsapp)) {
    return naoDeu('WhatsApp inválido. Use o formato +55 51 90000-0000.');
  }

  const { error } = await supabase
    .from('venues')
    .update({
      endereco: texto(entrada.endereco, 160) || null,
      telefone: texto(entrada.telefone, 20) || null,
      whatsapp: whatsapp || null,
    })
    .eq('id', casaId);
  return error ? naoDeu('Não deu para salvar os dados da casa.', 502) : { ok: true };
}

/** Valida uma faixa vinda da tela antes de encostar no banco. */
function faixaValida(f: unknown): f is FaixaHorario {
  if (!f || typeof f !== 'object') return false;
  const x = f as FaixaHorario;
  return (
    Array.isArray(x.dias) &&
    x.dias.length > 0 &&
    x.dias.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    /^\d{2}:\d{2}$/.test(String(x.abre)) &&
    /^\d{2}:\d{2}$/.test(String(x.fecha))
  );
}

export async function salvarMarca(
  supabase: SupabaseClient,
  casaId: string,
  entrada: { slug: unknown; instagram: unknown; horario: unknown },
): Promise<Resultado> {
  if (typeof entrada.slug !== 'string' || !entrada.slug) return naoDeu('Marca inválida.');

  const instagram = texto(entrada.instagram, 40);
  if (instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    return naoDeu('Instagram inválido. Use só letras, números, ponto e sublinhado.');
  }

  const bruto = Array.isArray(entrada.horario) ? entrada.horario : [];
  if (!bruto.every(faixaValida)) {
    return naoDeu('Tem faixa de horário incompleta. Marque os dias e preencha as duas horas.');
  }
  if (bruto.length > 8) return naoDeu('Máximo de 8 faixas por marca.');

  const { error } = await supabase
    .from('brands')
    .update({
      instagram: instagram ? (instagram.startsWith('@') ? instagram : '@' + instagram) : null,
      horario: bruto,
    })
    .eq('venue_id', casaId)
    .eq('slug', entrada.slug);
  return error ? naoDeu('Não deu para salvar a marca.', 502) : { ok: true };
}
