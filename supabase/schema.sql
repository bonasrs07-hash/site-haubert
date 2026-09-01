-- =============================================================================
-- CASA + HAUBERT, fonte de verdade do banco
-- =============================================================================
-- Multi-tenant por CASA (venue). Dentro de uma casa existem N marcas.  (ADR-002)
--
-- REGRA INEGOCIÁVEL: toda tabela de domínio carrega venue_id e tem RLS.
-- Tabela sem RLS no Supabase é tabela pública. Não existe "ligo depois".
--
-- Fase 1 não usa reservations (reserva vai por WhatsApp, ADR-005). A tabela
-- nasce aqui mesmo assim, para que a política de acesso seja pensada antes de
-- existir dado pessoal dentro dela.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. TENANT, a casa
-- =============================================================================
create table if not exists public.venues (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,               -- 'casa-haubert'
  nome         text not null,                      -- 'CASA + HAUBERT'
  cidade       text not null,
  uf           char(2) not null,
  endereco     text,
  telefone     text,
  whatsapp     text,                               -- E.164, ex '+5551999999999'
  latitude     numeric(10,7),
  longitude    numeric(10,7),
  features     jsonb not null default '{}'::jsonb, -- flags: reserva_nativa, cardapio_dinamico, agenda
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on column public.venues.features is
  'Feature flags por tenant. Ex: {"reserva_nativa": false, "agenda": true}';

-- =============================================================================
-- 2. MARCAS, CASA (dia) e HAUBERT (noite)
-- =============================================================================
create table if not exists public.brands (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues(id) on delete cascade,
  slug         text not null,                      -- 'casa' | 'haubert'
  nome         text not null,                      -- 'CASA Coffee Colab'
  mote         text,                               -- 'Luz. Leveza. Encontro.'
  modo         text not null check (modo in ('dia','noite')),
  instagram    text,
  horario      jsonb not null default '{}'::jsonb, -- {"qui":["19:00","23:30"], ...}
  tokens       jsonb not null default '{}'::jsonb, -- paleta + fontes (design system)
  copy         jsonb not null default '{}'::jsonb, -- manifesto e frases proprietárias
  ordem        smallint not null default 0,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (venue_id, slug)
);

comment on column public.brands.tokens is
  'Espelha docs/02_DESIGN_SYSTEM/tokens.css. Validar o shape com Zod na camada de serviços, JSONB não tem checagem de tipo.';
comment on column public.brands.copy is
  'Copy vinda de brand/BRAND-DNA-EXTRAIDO.md. Nenhuma frase inventada pelo dev.';

-- =============================================================================
-- 3. CARDÁPIO
-- =============================================================================
create table if not exists public.menu_sections (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references public.venues(id) on delete cascade,
  brand_id   uuid not null references public.brands(id) on delete cascade,
  nome       text not null,                        -- 'Nossos cortes', 'Cafés'
  descricao  text,
  ordem      smallint not null default 0,
  publicado  boolean not null default false,
  criado_em  timestamptz not null default now()
);

create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  section_id  uuid not null references public.menu_sections(id) on delete cascade,
  nome        text not null,                       -- 'Ancho'
  descricao   text,                                -- 'Cortes espalhados a sabor marcante'
  preco_cents integer check (preco_cents is null or preco_cents >= 0),
  imagem_path text,                                -- caminho no Storage
  tags        text[] not null default '{}',        -- {'assinatura','defumado'}
  publicado   boolean not null default false,
  ordem       smallint not null default 0,
  criado_em   timestamptz not null default now()
);

comment on column public.menu_items.preco_cents is
  'Centavos, inteiro. Nunca float para dinheiro. Nulo = preço não divulgado (Fase 1).';

-- =============================================================================
-- 4. AGENDA, eventos, DJs, collabs
-- =============================================================================
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  brand_id    uuid references public.brands(id) on delete set null,
  slug        text not null,
  titulo      text not null,                       -- 'In The Flow'
  descricao   text,
  inicio_em   timestamptz not null,
  fim_em      timestamptz,
  lineup      text[] not null default '{}',        -- {'JORDECUTS','KAIANE ALMEIDA'}
  imagem_path text,
  publicado   boolean not null default false,
  criado_em   timestamptz not null default now(),
  unique (venue_id, slug),
  constraint events_periodo_valido check (fim_em is null or fim_em > inicio_em)
);

create index if not exists events_venue_inicio_idx
  on public.events (venue_id, inicio_em desc) where publicado;

-- =============================================================================
-- 5. RESERVAS, Fase 3 (na Fase 1 a reserva vai por WhatsApp, ADR-005)
-- =============================================================================
create table if not exists public.reservations (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.venues(id) on delete cascade,
  brand_id      uuid references public.brands(id) on delete set null,
  nome          text not null,
  telefone      text not null,
  email         text,
  pessoas       smallint not null check (pessoas between 1 and 30),
  data_hora     timestamptz not null,
  observacao    text,
  status        text not null default 'pendente'
                check (status in ('pendente','confirmada','recusada','cancelada','no_show')),
  origem        text not null default 'site',
  anonimizada_em timestamptz,                      -- LGPD: retenção de 12 meses
  criado_em     timestamptz not null default now()
);

create index if not exists reservations_venue_data_idx
  on public.reservations (venue_id, data_hora desc);

comment on table public.reservations is
  'Dado pessoal (LGPD). Base legal: execução de contrato. Retenção: 12 meses, depois anonimizar via job. Nunca logar telefone ou e-mail.';

-- =============================================================================
-- 6. EQUIPE, quem pode editar no painel
-- =============================================================================
create table if not exists public.venue_members (
  venue_id  uuid not null references public.venues(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  papel     text not null default 'editor' check (papel in ('dono','editor')),
  criado_em timestamptz not null default now(),
  primary key (venue_id, user_id)
);

-- =============================================================================
-- 7. RLS, definição de pronto (P-005)
-- =============================================================================
alter table public.venues         enable row level security;
alter table public.brands         enable row level security;
alter table public.menu_sections  enable row level security;
alter table public.menu_items     enable row level security;
alter table public.events         enable row level security;
alter table public.reservations   enable row level security;
alter table public.venue_members  enable row level security;

-- Helper: o usuário atual pertence a esta casa?
-- ATENÇÃO: security definer NÃO é descuido. venue_members tem RLS que chama
-- esta mesma função; sem security definer a policy recursaria infinitamente.
-- Não remova. Por isso o search_path está fixado em public.
create or replace function public.e_membro_da_casa(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venue_members m
    where m.venue_id = p_venue_id and m.user_id = auth.uid()
  );
$$;

-- ---- Leitura pública: só o que está publicado e de casa ativa ---------------
drop policy if exists "casa ativa é pública" on public.venues;
create policy "casa ativa é pública"
  on public.venues for select
  using (ativo);

drop policy if exists "marca de casa ativa é pública" on public.brands;
create policy "marca de casa ativa é pública"
  on public.brands for select
  using (exists (select 1 from public.venues v where v.id = venue_id and v.ativo));

drop policy if exists "seção publicada é pública" on public.menu_sections;
create policy "seção publicada é pública"
  on public.menu_sections for select
  using (publicado);

drop policy if exists "item publicado é público" on public.menu_items;
create policy "item publicado é público"
  on public.menu_items for select
  using (exists (
    select 1 from public.menu_sections s
    where s.id = section_id and s.publicado
  ));

drop policy if exists "evento publicado é público" on public.events;
create policy "evento publicado é público"
  on public.events for select
  using (publicado);

-- ---- Reservas: NUNCA públicas ----------------------------------------------
drop policy if exists "reserva só para a equipe da casa" on public.reservations;
create policy "reserva só para a equipe da casa"
  on public.reservations for select
  using (public.e_membro_da_casa(venue_id));

drop policy if exists "equipe atualiza reserva da própria casa" on public.reservations;
create policy "equipe atualiza reserva da própria casa"
  on public.reservations for update
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

-- Escrita de reserva NÃO tem policy para anon de propósito:
-- na Fase 3 ela passa por endpoint de servidor com validação. (docs/11_SEGURANCA)

-- ---- Escrita do painel: só membro da própria casa ---------------------------
drop policy if exists "equipe edita a própria casa" on public.venues;
create policy "equipe edita a própria casa"
  on public.venues for update
  using (public.e_membro_da_casa(id))
  with check (public.e_membro_da_casa(id));

drop policy if exists "equipe gerencia marcas da própria casa" on public.brands;
create policy "equipe gerencia marcas da própria casa"
  on public.brands for all
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

drop policy if exists "equipe gerencia seções da própria casa" on public.menu_sections;
create policy "equipe gerencia seções da própria casa"
  on public.menu_sections for all
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

drop policy if exists "equipe gerencia itens da própria casa" on public.menu_items;
create policy "equipe gerencia itens da própria casa"
  on public.menu_items for all
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

drop policy if exists "equipe gerencia eventos da própria casa" on public.events;
create policy "equipe gerencia eventos da própria casa"
  on public.events for all
  using (public.e_membro_da_casa(venue_id))
  with check (public.e_membro_da_casa(venue_id));

drop policy if exists "membro vê a própria equipe" on public.venue_members;
create policy "membro vê a própria equipe"
  on public.venue_members for select
  using (public.e_membro_da_casa(venue_id));

-- venue_members não tem policy de escrita de propósito: adicionar ou remover
-- membro é operação administrativa, feita por endpoint de servidor com
-- service_role na Fase 3. Nenhum editor promove a si mesmo a dono.

-- =============================================================================
-- 8. Trigger de atualizado_em
-- =============================================================================
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists venues_touch on public.venues;
create trigger venues_touch before update on public.venues
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists brands_touch on public.brands;
create trigger brands_touch before update on public.brands
  for each row execute function public.tocar_atualizado_em();

-- =============================================================================
-- CHECKLIST antes de qualquer merge que toque este arquivo
-- =============================================================================
-- [ ] Tabela nova tem venue_id?
-- [ ] Tabela nova tem `enable row level security`?
-- [ ] Tabela nova tem policy de SELECT e de escrita?
-- [ ] Dinheiro é integer em centavos (nunca float)?
-- [ ] Dado pessoal tem comentário de base legal e retenção?
-- [ ] O teste de isolamento entre tenants continua passando?
-- =============================================================================
