-- 003, item despublicado do cardápio não pode ser lido por estranho.
--
-- O QUE ESTAVA ERRADO
-- A policy de leitura pública de `menu_items` olhava apenas o `publicado` da
-- SEÇÃO pai. Só que o item tem a sua própria coluna `publicado`, o painel dá ao
-- dono uma caixa "No site" por item, e o site filtra por ela. A RLS não.
--
-- Resultado: um prato marcado "fora do site" ficava escondido no site e
-- LEGÍVEL por qualquer pessoa na API pública, com a chave anônima, que sai no
-- HTML de toda página. Preço em revisão, prato de teste, item de um cardápio
-- ainda não anunciado: tudo visível para quem soubesse pedir.
--
-- Confirmado na prática antes desta correção, com a chave anônima:
--   HTTP 200 -> [{"nome":"...","preco_cents":99900,"publicado":false}]
-- E o controle, um evento despublicado, voltou [] como devia. A policy de
-- `events` sempre checou o próprio flag; a de `menu_items` era a exceção.
--
-- A CORREÇÃO
-- Exigir as DUAS condições: a seção publicada E o item publicado. É a mesma
-- pergunta que `lib/cardapio.ts` já fazia ao ler para o site. Agora o banco faz
-- a mesma, que é onde ela vale mesmo, porque a API pública não passa pelo
-- nosso código.
--
-- Idempotente, como as outras deste projeto.

drop policy if exists "item publicado é público" on public.menu_items;

create policy "item publicado é público"
  on public.menu_items
  for select
  using (
    publicado
    and exists (
      select 1 from public.menu_sections s
      where s.id = menu_items.section_id
        and s.publicado
    )
  );

-- Conferência de pronto:
-- [x] A tabela continua com `enable row level security`
-- [x] A policy de escrita da equipe (`e_membro_da_casa`) não foi tocada
-- [x] O painel continua lendo tudo, publicado ou não, com o token do dono
-- [x] Provado com a chave anônima que o item despublicado deixou de voltar
