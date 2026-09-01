-- =============================================================================
-- 002 — Reconciliação da identidade no banco
-- =============================================================================
-- Este arquivo existe por causa de um erro real, e vale registrar qual.
--
-- Quando `src/lib/casa.ts` passou a ler identidade do BANCO (com as constantes
-- como piso), o build local imediatamente regrediu os Instagram para
-- `@casa.coffee` e `@haubert.steakhouse` — os handles ANTIGOS, que estavam no
-- seed 001 e que já haviam sido corrigidos em `constants/casa.ts`.
--
-- O banco não estava errado por acaso: ele foi semeado antes da correção. Mas
-- no instante em que ele virou fonte de verdade, "desatualizado" virou
-- "errado no ar" — e o Instagram é HOJE o canal ativo de reserva, porque o
-- WhatsApp ainda é BLK-005. Publicar isso mandaria cliente para o perfil
-- errado.
--
-- A lição, que fica: trocar a fonte de verdade para um banco só é seguro
-- depois de conferir o que já está dentro dele.
--
-- Além dos handles, aqui também se conserta o FORMATO do horário.
-- `brands.horario` estava como `{"dom":["09:00","19:00"], ...}` — um mapa por
-- dia — enquanto a aplicação inteira usa `[{dias:[...], abre, fecha}]`, que é
-- o formato que `estaAbertaEm()` lê no browser para acender a bolinha de
-- "aberto agora". Dois formatos para a mesma coisa é a divergência que este
-- trabalho existe para acabar.
--
-- Daqui em diante quem edita isto é o PAINEL, não este arquivo.
-- =============================================================================

update public.brands b
set
  instagram = '@casacoffeecolab',
  horario = '[
    {"dias": [1,2,3,4,5], "abre": "08:00", "fecha": "19:00"},
    {"dias": [6,0],       "abre": "09:00", "fecha": "19:00"}
  ]'::jsonb
from public.venues v
where b.venue_id = v.id
  and v.slug = 'casa-haubert'
  and b.slug = 'casa';

update public.brands b
set
  instagram = '@haubert_taste',
  horario = '[
    {"dias": [4,5,6,0], "abre": "19:00", "fecha": "00:00"}
  ]'::jsonb
from public.venues v
where b.venue_id = v.id
  and v.slug = 'casa-haubert'
  and b.slug = 'haubert';

comment on column public.brands.horario is
  'Faixas no formato [{dias:[0-6], abre:"HH:MM", fecha:"HH:MM"}]. E o MESMO shape que estaAbertaEm() le no browser. Validar com ehListaDeFaixas() na camada de servicos: JSONB nao tem checagem de tipo.';
