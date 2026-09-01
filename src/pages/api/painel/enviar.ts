/**
 * Envio de foto para o acervo. (ADR-008)
 *
 * A sessão já foi validada pelo middleware, se esta linha executa, existe um
 * membro da casa do outro lado. O que ainda NÃO foi validado é o arquivo, e é
 * isso que `registrarEnvio` faz antes de qualquer byte tocar o Storage.
 */
import type { APIRoute } from 'astro';
import { registrarEnvio } from '@/lib/midia';
import { limparNome } from '@/lib/upload';

export const prerender = false;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  let formulario: FormData;
  try {
    formulario = await request.formData();
  } catch {
    return json({ erro: 'O envio chegou incompleto. Tente de novo.' }, 400);
  }

  const arquivo = formulario.get('arquivo');
  if (!(arquivo instanceof File)) return json({ erro: 'Escolha uma imagem.' }, 400);

  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  const resultado = await registrarEnvio(locals.sessao, {
    bytes,
    nome: limparNome(String(formulario.get('nome') ?? arquivo.name)),
    alt: String(formulario.get('alt') ?? ''),
    temPessoa: formulario.get('temPessoa') === 'sim',
    autorizacaoImagem: formulario.get('autorizacao') === 'sim',
  });

  if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);
  return json({ item: resultado.valor.item });
};
