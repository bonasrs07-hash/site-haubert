/**
 * Escritas do cardápio. A sessão já foi validada pelo middleware.
 *
 * Um endpoint com `acao` em vez de sete rotas: a autorização é a mesma para
 * todas (ser membro da casa), a validação vive na camada de serviços, e sete
 * arquivos de três linhas seriam sete lugares para esquecer a mesma checagem.
 */
import type { APIRoute } from 'astro';
import {
  apagarItem,
  apagarSecao,
  criarItem,
  criarSecao,
  editarItem,
  editarSecao,
  mover,
  type Resultado,
} from '@/lib/cardapio-mutacoes';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }

  const { supabase, casaId } = locals.sessao;
  let r: Resultado;

  switch (corpo.acao) {
    case 'secao.criar':
      r = await criarSecao(supabase, casaId, { nome: corpo.nome, descricao: corpo.descricao });
      break;
    case 'secao.editar':
      r = await editarSecao(supabase, casaId, {
        id: corpo.id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        publicado: corpo.publicado,
      });
      break;
    case 'secao.apagar':
      r = await apagarSecao(supabase, casaId, corpo.id);
      break;
    case 'secao.mover':
      r = await mover(supabase, casaId, 'menu_sections', corpo.id, corpo.direcao);
      break;
    case 'item.criar':
      r = await criarItem(supabase, casaId, {
        secaoId: corpo.secaoId,
        nome: corpo.nome,
        descricao: corpo.descricao,
        preco: corpo.preco,
      });
      break;
    case 'item.editar':
      r = await editarItem(supabase, casaId, {
        id: corpo.id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        preco: corpo.preco,
        publicado: corpo.publicado,
      });
      break;
    case 'item.apagar':
      r = await apagarItem(supabase, casaId, corpo.id);
      break;
    case 'item.mover':
      r = await mover(supabase, casaId, 'menu_items', corpo.id, corpo.direcao);
      break;
    default:
      return json({ erro: 'Ação desconhecida.' }, 400);
  }

  return r.ok ? json({ ok: true }) : json({ erro: r.erro }, r.status);
};
