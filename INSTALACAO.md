# Instalação — ambiente local

> **Fase 1 em pé.** O projeto Astro já está inicializado e o site constrói. Este
> documento é o roteiro de quem clona o repositório — e o registro de por que
> cada peça está onde está.

## Requisitos

| Ferramenta | Versão | Nota |
|---|---|---|
| Node.js | 20 LTS ou superior | Astro 7 exige ≥ 20.3 |
| npm | 10+ | Vem com o Node 20 |
| Supabase CLI | última | Migrations e ambiente local — só a partir da Fase 2 |
| Conta Vercel | Hobby | Grátis |
| Conta Supabase | Free | Projeto na região **São Paulo** — só a partir da Fase 2 |

## Passo 1 — Dependências

```bash
npm install
```

Já vem tudo do `package.json`. Duas escolhas que fogem do caminho padrão e
valem explicação:

- **Tailwind entra pelo plugin do Vite** (`@tailwindcss/vite`), não pelo
  `@astrojs/tailwind`. É como a v4 é instalada, e é o que permite o
  `@theme inline` de `src/styles/global.css` apontar as utilitárias para as
  custom properties — sem isso, trocar Dia/Noite exigiria regerar CSS.
- **`output: 'static'` + adapter**, não `hybrid`. O modo `hybrid` foi removido
  no Astro 5+; o comportamento equivalente é `static` com `export const
  prerender = false` na rota que precisar de SSR. Ver
  [ADR-001](docs/08_DECISOES/adr-001-stack-astro-supabase.md).

## Passo 2 — Fontes (self-hosted, sem Google Fonts)

```bash
# já instaladas pelo passo 1; o comando fica registrado para referência
npm i @fontsource/anton @fontsource/bebas-neue @fontsource/space-grotesk @fontsource/space-mono
```

Self-hosted por dois motivos: a CSP fecha em `font-src 'self'` e nenhum IP de
visitante vaza para terceiro — ver [`docs/11_SEGURANCA/`](docs/11_SEGURANCA/README.md).
A escolha das famílias está no [ADR-003](docs/08_DECISOES/adr-003-tipografia-substituta.md).

## Passo 3 — Variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Onde vive | Vai para o browser? |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | `.env` | **Sim** |
| `PUBLIC_SUPABASE_ANON_KEY` | `.env` | **Sim** — a proteção é a RLS, não o segredo da chave |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` local + painel da Vercel | **NUNCA** |
| `PUBLIC_WHATSAPP` | `.env` | Sim — número E.164 |

> Prefixo `PUBLIC_` significa que a variável **vai para o bundle**. Não existe
> "PUBLIC_ mas secreto". A `service_role` nunca leva esse prefixo.

## Passo 4 — Banco

```bash
supabase link --project-ref <ref-do-projeto>
```

```bash
supabase db push
```

O schema é [`supabase/schema.sql`](supabase/schema.sql). Toda tabela nasce com
RLS — tabela sem policy não entra em `main`.

Seeds:

```bash
supabase db execute --file supabase/seeds/001_casa_haubert.sql
```

## Passo 5 — Rodar

```bash
npm run dev
```

Abre em `http://localhost:4321`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local com HMR |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build localmente (com o adapter Vercel, use `vercel dev`) |
| `npm run test` | Vitest — lógica de horário e de reserva |
| `npm run check` | `astro check` (tipos em .astro e .ts) |
| `npm run marca:recortar` | Reextrai as fotos das pranchas de `brand/` para `src/assets/marca/` ([ADR-007](docs/08_DECISOES/adr-007-fotos-do-deck.md)) |

## Checklist de merge

- [ ] `.env` está no `.gitignore` (só `.env.example` é versionado)
- [ ] `astro.config.mjs` com `output: 'static'` + adapter
- [ ] `tokens.css` importado no layout base
- [ ] Script inline de tema no `<head>`, antes de qualquer CSS de componente
- [ ] `npm run build` passa sem aviso
- [ ] `npm run check` com 0 erro
- [ ] `npm run test` verde
- [ ] Nenhuma cor literal em componente — só `var(--cor-*)` (P-004)

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| A página pisca ao carregar | Script de tema não está inline e síncrono no `<head>` — [ADR-004](docs/08_DECISOES/adr-004-modo-dia-noite.md) |
| Rota dinâmica servindo dado velho | Falta `export const prerender = false` |
| Consulta retorna vazio com a chave `anon` | RLS sem policy de SELECT — o comportamento está correto, a policy é que falta |
| Fonte não carrega | Falta importar o `@fontsource` no layout |
