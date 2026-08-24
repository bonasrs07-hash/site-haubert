# 01 — Arquitetura

> Decisão registrada em **[ADR-001](../08_DECISOES/adr-001-stack-astro-supabase.md)**.
> Multi-tenancy em **[ADR-002](../08_DECISOES/adr-002-multi-tenant-white-label.md)**.

## Modelo

**Modelo A-híbrido** — front-end renderizado no build/edge consumindo um BaaS
direto pela camada de serviços. Sem API própria na Fase 1.

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (Hobby)                                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Astro 7 — output: 'static' + adapter Vercel       │ │
│  │                                                     │ │
│  │  ESTÁTICO (build)          SSR (edge)              │ │
│  │  /            home         /agenda                 │ │
│  │  /sobre                    /cardapio               │ │
│  │  /cultura                  /evento/[slug]          │ │
│  │  /contato                  /painel/*   (auth)      │ │
│  │  /noite       espelho                              │ │
│  │                                                     │ │
│  │  Ilhas React: AlternadorModo · BotaoReserva ·      │ │
│  │               CarrosselCortes                       │ │
│  └───────────────────────┬────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────┘
                           │  src/lib/  (camada de serviços)
                           │  — o ÚNICO ponto que fala com o backend
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase (região São Paulo)                             │
│  Postgres + RLS  ·  Auth  ·  Storage (fotos)             │
│  venues · brands · menu_sections · menu_items ·          │
│  events · reservations · venue_members                   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                     wa.me (reserva, Fase 1 — ADR-005)
```

## Por que cada peça

| Peça | Papel | Por quê |
|---|---|---|
| **Astro `static` + adapter** | Renderização | HTML pronto no primeiro byte resolve SEO local e LCP por arquitetura, sem abrir mão de rota dinâmica |
| **Ilhas React** | Interatividade | Só onde há estado real; o resto não paga hidratação |
| **Tailwind + custom properties** | Estilo | Classes utilitárias apontando para tokens; a troca Dia/Noite reescreve tokens, não classes |
| **Supabase** | Dados, auth, arquivos | Postgres de verdade + RLS resolve o isolamento multi-tenant sem backend próprio; tier gratuito atende o volume |
| **Vercel** | Deploy | Build por push, edge para as rotas SSR, custo zero no Hobby |

## Camadas

### 1. Apresentação — `src/pages/`, `src/components/`
Layouts e seções. **Não conhece o Supabase.** Recebe dado já formatado.

### 2. Serviços — `src/lib/` *(P-001)*
O único ponto que fala com o backend. Uma função por caso de uso, tipada,
devolvendo o shape que a UI precisa. Trocar de provedor mexe só aqui.

```
src/lib/
  supabase.ts        cliente anon (browser) + cliente de servidor (nunca exposto)
  venues.ts          buscarCasa(slug)
  brands.ts          buscarMarcas(venueId) · buscarTokens(brandId)
  menu.ts            buscarCardapio(brandId)
  events.ts          buscarAgenda(venueId, { de, ate }) · buscarEvento(slug)
  reservas.ts        montarLinkWhatsapp(...)  ← Fase 1: não toca o banco
```

### 3. Dados — `supabase/`
`schema.sql` é a fonte de verdade. Migrations versionadas. **RLS em toda
tabela** *(P-005)*.

### 4. Estado de UI — o atributo `data-modo` no `<html>`
Não há contexto de UI. O único estado global de interface é o modo
(dia/noite), e ele vive como atributo no `<html>`: o CSS lê direto e o
JS troca com um `setAttribute`. Sem React na Fase 1, contexto seria
cerimônia sem função ([ADR-006](../08_DECISOES/adr-006-fase1-sem-react.md)).

## Estratégia de renderização por rota

| Rota | Modo | Motivo |
|---|---|---|
| `/` | Estático | Conteúdo institucional; muda em deploy |
| `/noite` | Estático | Rota do HAUBERT com o modo forçado e canônica própria (ADR-004). Não há dado dinâmico a buscar — SSR aqui só adicionaria latência |
| `/sobre`, `/fogo`, `/cultura`, `/contato` | Estático | Institucional |
| `/privacidade`, `/404` | Estático, `noindex` | Não devem ser encontradas na busca |
| `/cardapio` | SSR + cache 5min | Vem do banco; a equipe edita |
| `/agenda`, `/evento/[slug]` | SSR + cache 5min | Vem do banco; muda toda semana |
| `/painel/*` | SSR, sem cache | Autenticado |

> **Armadilha do `static` + adapter:** rota dinâmica sem `export const prerender = false`
> congela no build. Item obrigatório no checklist de PR.

## Fronteira de segurança

- **Chave `anon`** (`PUBLIC_SUPABASE_ANON_KEY`): pode ir ao browser. Toda a
  proteção vem da RLS, não do segredo da chave
- **Chave `service_role`**: só em contexto de servidor (endpoint Astro,
  Edge Function). Nunca em `PUBLIC_*`, nunca em ilha React *(`CLAUDE.md`)*
- **Escrita pública** (Fase 3: reserva nativa): passa por endpoint de servidor
  com validação, nunca por `insert` direto do browser

Detalhe em [`docs/11_SEGURANCA/`](../11_SEGURANCA/README.md).

## Ambientes

| Ambiente | Front | Banco |
|---|---|---|
| Local | `npm run dev` (:4321) | Projeto Supabase de dev |
| Preview | Deploy por branch na Vercel | Projeto Supabase de dev |
| Produção | Domínio próprio (pendente — BLK-006) | Projeto Supabase de prod |

Variáveis em `.env.example`. Nada de segredo no repositório.

## Orçamento de performance

| Métrica | Teto | Onde se mede |
|---|---|---|
| LCP (mobile, 4G) | **< 2,0s** | Lighthouse CI |
| JS enviado na home | **< 60kb** | `astro build` + análise de bundle |
| Imagem acima da dobra | **< 200kb** | Revisão de PR |
| CLS | **< 0,1** | Lighthouse CI |

Estourar teto é bloqueio de merge, não observação.

## O que muda quando escalar

| Gatilho | Movimento |
|---|---|
| Segunda casa (Fase 4) | Nada estrutural — é seed + domínio (ADR-002) |
| Reserva nativa (Fase 3) | Endpoint de servidor + tabela `reservations` + e-mail transacional |
| Regra de negócio ficando complexa | Extrair para Edge Function; a camada de serviços já isola a UI |
| Volume acima do tier gratuito | Supabase Pro; sem mudança de código |
| E-commerce | Aí sim reavaliar Next.js — registrado como alternativa no ADR-001 |
