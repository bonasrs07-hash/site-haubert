-- =============================================================================
-- SEED, a casa servida por este deploy e suas duas marcas
-- =============================================================================
-- Espelha `src/constants/casa.ts`, que já anunciava esta migração no próprio
-- cabeçalho. Toda a copy vem do guia SOCIAL DNA transcrito em `brand/`, nada
-- aqui foi inventado pelo desenvolvedor. (P-003, P-006)
--
-- Idempotente de propósito: rodar duas vezes não duplica nem sobrescreve o que
-- a equipe já tiver editado pelo painel.
--
-- O QUE FICA NULO, E POR QUÊ: endereço, telefone e whatsapp são BLK-003 e
-- BLK-005. Nulo é o dado honesto enquanto o cliente não confirma, preencher
-- com chute faz o site afirmar endereço errado, que é pior que não afirmar.
-- =============================================================================

-- =============================================================================
-- 1. O TENANT
-- =============================================================================
insert into public.venues (slug, nome, cidade, uf, features)
values (
  'casa-haubert',
  'CASA + HAUBERT',
  'Novo Hamburgo',
  'RS',
  -- Fase 1: nada dinâmico ainda. As flags ligam conforme cada fase entra.
  '{"reserva_nativa": false, "cardapio_dinamico": false, "agenda": false}'::jsonb
)
on conflict (slug) do nothing;

-- =============================================================================
-- 2. AS DUAS MARCAS
-- =============================================================================
-- `horario` no shape do schema: {"dia": ["abre","fecha"]}. Ambos pendentes de
-- confirmação do cliente (BLK-003), o que está aqui é o que o guia declara.

insert into public.brands (venue_id, slug, nome, mote, modo, instagram, horario, copy, ordem)
select
  v.id,
  'casa',
  'CASA Coffee Colab',
  'Luz. Leveza. Encontro.',
  'dia',
  '@casacoffeecolab',
  '{"seg":["08:00","19:00"],"ter":["08:00","19:00"],"qua":["08:00","19:00"],"qui":["08:00","19:00"],"sex":["08:00","19:00"],"sab":["09:00","19:00"],"dom":["09:00","19:00"]}'::jsonb,
  '{
     "manifesto": "Mais café. Mais que churrasco. Mais que um lugar.",
     "manifestoApoio": [
       "Somos ponto de encontro entre boas pessoas, boa comida, bom design e boas histórias.",
       "Do café da manhã ao último brinde da noite, conectamos duas culturas que se completam: leveza e encontro, fogo e celebração.",
       "Do dia à noite. Do simples ao memorável."
     ],
     "convite": "Aqui, o tempo tem outro ritmo.",
     "assinatura": "O dia alimenta."
   }'::jsonb,
  0
from public.venues v
where v.slug = 'casa-haubert'
on conflict (venue_id, slug) do nothing;

insert into public.brands (venue_id, slug, nome, mote, modo, instagram, horario, copy, ordem)
select
  v.id,
  'haubert',
  'HAUBERT Steak & Grillhouse',
  'Fogo. Força. Tradição.',
  'noite',
  '@haubert_taste',
  -- Board 008 do guia: "A partir das 19h · qui – dom".
  '{"qui":["19:00","00:00"],"sex":["19:00","00:00"],"sab":["19:00","00:00"],"dom":["19:00","00:00"]}'::jsonb,
  '{
     "manifesto": "Não é sobre queimar. É sobre dominar.",
     "manifestoApoio": [
       "O fogo revela o que é feito com intenção.",
       "Aqui, o tempo é ingrediente. A técnica é o que constrói sabor.",
       "O fogo é o que transforma."
     ],
     "convite": "Quando o dia desacelera, a casa muda de ritmo.",
     "assinatura": "A lenha transforma."
   }'::jsonb,
  1
from public.venues v
where v.slug = 'casa-haubert'
on conflict (venue_id, slug) do nothing;

-- `tokens` fica vazio de propósito: a fonte de verdade da paleta continua sendo
-- docs/02_DESIGN_SYSTEM/tokens.css enquanto o site não lê tema do banco.
-- Preencher agora criaria duas verdades para a mesma cor. (ADR-002, Fase 4)
