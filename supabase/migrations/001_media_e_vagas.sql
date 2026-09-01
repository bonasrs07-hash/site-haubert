-- =============================================================================
-- 001 — Acervo de mídia e as vagas de foto do site  (ADR-008)
-- =============================================================================
-- Duas tabelas e uma separação que importa:
--
--   media       — o ARQUIVO. Existe uma vez, é reusável para sempre. É a galeria.
--   media_slots — a VAGA. Diz qual arquivo está, agora, em 'foto-dia'.
--
-- Trocar a foto da home é reapontar uma vaga, não apagar um arquivo. É o que
-- permite "usar aquela foto de novo depois" sem reenviar nada — e é por isso
-- que a FK de media_slots é `on delete restrict`: ninguém apaga da galeria uma
-- foto que está no ar no site.
--
-- Como sempre: venue_id em tudo, RLS em tudo. (ADR-002, P-005)
-- =============================================================================

-- =============================================================================
-- 1. ACERVO
-- =============================================================================
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues(id) on delete cascade,
  storage_path text not null,                       -- 'casa-haubert/2026/08/xxx.webp'
  nome         text not null,                       -- nome legível na galeria
  alt          text not null default '',            -- acessibilidade + ADR-007
  largura      integer not null check (largura > 0),
  altura       integer not null check (altura  > 0),
  bytes        integer not null check (bytes   > 0),
  mime         text    not null,
  tem_pessoa   boolean not null default false,
  autorizacao_imagem boolean not null default false,
  criado_em    timestamptz not null default now(),
  criado_por   uuid references auth.users(id) on delete set null,
  unique (venue_id, storage_path)
);

comment on table public.media is
  'Acervo de fotos da casa. O arquivo vive no Storage; aqui ficam as dimensoes (que o astro:assets exige para otimizar imagem remota) e os metadados.';

comment on column public.media.alt is
  'Descreve a CENA, nunca afirma que a cena e a casa real enquanto o acervo for emprestado do deck. Ver ADR-007.';

comment on column public.media.tem_pessoa is
  'O dono declarou que ha pessoa identificavel na foto. Guardado junto com a autorizacao para haver trilha do que foi afirmado, e quando. (BLK-008)';

comment on column public.media.autorizacao_imagem is
  'Direito de imagem (BLK-008, memory/restrictions.md): foto com pessoa identificavel so vai ao ar com autorizacao registrada. O painel bloqueia a publicacao sem esta marca.';

create index if not exists media_venue_criado_idx
  on public.media (venue_id, criado_em desc);

-- =============================================================================
-- 2. AS VAGAS DO SITE
-- =============================================================================
-- `chave` é o identificador da posição no site ('foto-dia', 'fogo-3', 'tira-5').
-- O catálogo de chaves vive em src/lib/vagas.ts — aqui é texto de propósito:
-- casa nova tem outras vagas, e o banco não pode saber o layout de ninguém.
create table if not exists public.media_slots (
  venue_id       uuid not null references public.venues(id) on delete cascade,
  chave          text not null,
  media_id       uuid not null references public.media(id) on delete restrict,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  primary key (venue_id, chave)
);

comment on table public.media_slots is
  'Qual foto esta, agora, em cada posicao do site. Vaga ausente = o site usa o arquivo versionado em src/assets/marca/ (ADR-007 vira o piso, ADR-008).';

-- =============================================================================
-- 3. CONTROLE DE PUBLICAÇÃO
-- =============================================================================
-- O Hobby da Vercel dá 100 deploys por dia. Um botão "Publicar" sem freio é um
-- jeito silencioso de gastar a cota inteira num clique nervoso. O carimbo mora
-- no banco, e não em memória, porque cada requisição da Vercel pode cair numa
-- instância diferente — trava em memória não trava nada.
alter table public.venues
  add column if not exists ultima_publicacao_em timestamptz;

-- =============================================================================
-- 4. RLS — definição de pronto (P-005)
-- =============================================================================
alter table public.media       enable row level security;
alter table public.media_slots enable row level security;

-- Sem policy para `anon` DE PROPÓSITO nas duas tabelas.
-- O site publicado não consulta isto em runtime: quem lê é o BUILD, com a
-- service_role, que ignora RLS. Conceder leitura pública aqui exporia a galeria
-- inteira — inclusive foto enviada e ainda não publicada. (ADR-008)

drop policy if exists "equipe gerencia o acervo da propria casa" on public.media;
create policy "equipe gerencia o acervo da propria casa"
  on public.media for all
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

drop policy if exists "equipe gerencia as vagas da propria casa" on public.media_slots;
create policy "equipe gerencia as vagas da propria casa"
  on public.media_slots for all
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

-- =============================================================================
-- 5. STORAGE — bucket privado + policies por casa
-- =============================================================================
-- Privado, não público. As fotos vão para um site público, mas a GALERIA não é
-- pública: ela guarda material que o dono ainda não publicou. Quem baixa no
-- build é a service_role, por URL assinada de vida curta.
insert into storage.buckets (id, name, public)
values ('midia', 'midia', false)
on conflict (id) do nothing;

-- O primeiro segmento do caminho é o SLUG da casa: 'casa-haubert/2026/08/x.webp'.
-- É o que amarra o arquivo ao tenant sem precisar de join.
create or replace function public.casa_do_caminho(p_caminho text)
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select v.id from public.venues v
  where v.slug = split_part(p_caminho, '/', 1)
  limit 1;
$fn$;

drop policy if exists "equipe le a midia da propria casa" on storage.objects;
create policy "equipe le a midia da propria casa"
  on storage.objects for select
  using (
    bucket_id = 'midia'
    and public.e_membro_da_casa(public.casa_do_caminho(name))
  );

drop policy if exists "equipe envia midia para a propria casa" on storage.objects;
create policy "equipe envia midia para a propria casa"
  on storage.objects for insert
  with check (
    bucket_id = 'midia'
    and public.e_membro_da_casa(public.casa_do_caminho(name))
  );

drop policy if exists "equipe apaga midia da propria casa" on storage.objects;
create policy "equipe apaga midia da propria casa"
  on storage.objects for delete
  using (
    bucket_id = 'midia'
    and public.e_membro_da_casa(public.casa_do_caminho(name))
  );

-- =============================================================================
-- CHECKLIST (docs/11_SEGURANCA)
-- =============================================================================
-- [x] Tabela nova tem venue_id
-- [x] Tabela nova tem `enable row level security`
-- [x] Tabela nova tem policy de escrita; leitura pública NEGADA de propósito
-- [x] Sem dado pessoal novo (foto de pessoa é tratada por autorizacao_imagem)
-- [x] Storage com policy por tenant
-- =============================================================================
