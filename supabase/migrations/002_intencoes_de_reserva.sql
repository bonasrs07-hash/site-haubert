-- =============================================================================
-- 002 — Intenções de reserva
-- =============================================================================
-- O que esta tabela guarda, e o que ela DELIBERADAMENTE não guarda.
--
-- Guarda: quantas pessoas, quando, qual marca, por qual canal a conversa saiu,
-- de que página, e um código curto.
--
-- NÃO guarda nome, telefone nem e-mail. Não é esquecimento: o fluxo de reserva
-- não tem esses campos, e não pode ter. "Reserva em 3 toques" está em
-- `memory/restrictions.md` com "Exceção: Nenhuma", e pedir contato é um quarto
-- toque. Enquanto a reserva terminar no WhatsApp (ADR-005), quem tem o contato
-- é o WhatsApp — que já é o dono legítimo dele.
--
-- Consequência boa: sem dado pessoal, não há base legal a declarar, não há
-- prazo de retenção a cumprir e a página /privacidade continua dizendo a
-- verdade quando afirma que o site não guarda dado do visitante.
--
-- O `codigo` é o que costura as duas pontas: ele vai na mensagem do WhatsApp
-- E fica aqui. A equipe lê "reserva K7QP" na conversa e acha a linha.
--
-- Isto NÃO é a tabela `reservations` (Fase 3). Aquela guarda reserva
-- confirmada, com dado pessoal e retenção de 12 meses. Esta é um contador de
-- intenção. Misturar as duas seria transformar métrica em cadastro.
-- =============================================================================

create table if not exists public.reservation_intents (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references public.venues(id) on delete cascade,
  marca_slug text not null,
  codigo     text not null check (codigo ~ '^[A-Z0-9]{4}$'),
  pessoas    smallint not null check (pessoas between 1 and 30),
  quando     text not null default '' check (length(quando) <= 24),
  canal      text not null check (canal in ('whatsapp', 'telefone', 'instagram')),
  origem     text not null check (length(origem) <= 32),
  criado_em  timestamptz not null default now()
);

comment on table public.reservation_intents is
  'Toque no botao de reserva, com a escolha feita. SEM dado pessoal, de proposito: o fluxo de 3 toques nao pede contato. Nao confundir com public.reservations, que e reserva confirmada e tem LGPD.';

comment on column public.reservation_intents.codigo is
  'Codigo curto que tambem vai na mensagem do WhatsApp, para a equipe casar a conversa com esta linha.';

create index if not exists intents_venue_criado_idx
  on public.reservation_intents (venue_id, criado_em desc);

-- =============================================================================
-- RLS — definição de pronto (P-005)
-- =============================================================================
alter table public.reservation_intents enable row level security;

-- Leitura: só a equipe da casa. Nem anon, nem público.
drop policy if exists "equipe le as intencoes da propria casa" on public.reservation_intents;
create policy "equipe le as intencoes da propria casa"
  on public.reservation_intents for select
  using (public.e_membro_da_casa(venue_id));

-- Escrita: SEM policy para anon, de propósito, e é a mesma postura que
-- `reservations` já tinha. Quem grava é o endpoint do servidor, com a
-- service_role, depois de validar e de passar pelo freio. Abrir INSERT para
-- anon aqui seria entregar um gerador de linhas para qualquer um com um curl.
-- (docs/11_SEGURANCA, camada 3)

-- =============================================================================
-- CHECKLIST (docs/11_SEGURANCA)
-- =============================================================================
-- [x] Tabela nova tem venue_id
-- [x] Tabela nova tem `enable row level security`
-- [x] Policy de leitura; escrita negada para anon de propósito
-- [x] Sem dado pessoal: sem base legal, sem retenção, sem aviso novo
-- [x] Entrada validada no servidor (Zod) antes de chegar aqui
-- =============================================================================
