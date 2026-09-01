/**
 * Registro da intenção de reserva. Rota PÚBLICA.
 *
 * É chamada por `navigator.sendBeacon` no mesmo toque que abre o WhatsApp.
 * Fogo-e-esquece de verdade: qualquer coisa que dê errado aqui devolve 204 e
 * some. Uma métrica nunca pode segurar, atrasar ou quebrar uma reserva.
 * (CLAUDE.md — "logs de atividade fire-and-forget")
 *
 * Isto é entrada pública, ou seja, entrada hostil. O que a protege:
 *   - Zod, com teto em todo campo (`esquemaIntencao`);
 *   - freio por IP, em balde próprio, separado do login;
 *   - a tabela não aceita INSERT de `anon`; quem grava é este endpoint.
 *
 * E o que ela NÃO recebe: nome, telefone, e-mail. Não há dado pessoal neste
 * caminho, então não há base legal nova a declarar nem retenção a cumprir.
 */
import type { APIRoute } from 'astro';
import { esquemaIntencao, registrarIntencao } from '@/lib/intencoes';
import { registrarTentativa } from '@/lib/freio';

export const prerender = false;

/** 204 sempre. O cliente não usa a resposta, e não deve aprender nada com ela. */
const fim = () => new Response(null, { status: 204 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const freio = registrarTentativa(clientAddress ?? 'desconhecido', 'intencao');
    if (!freio.permitido) return fim();

    // `sendBeacon` manda Blob; ler como texto cobre Blob e fetch com JSON.
    const bruto = await request.text();
    if (!bruto || bruto.length > 2000) return fim();

    const analisado = esquemaIntencao.safeParse(JSON.parse(bruto));
    if (!analisado.success) return fim();

    await registrarIntencao(analisado.data);
  } catch {
    // Silêncio proposital. Ver o comentário do topo.
  }
  return fim();
};
