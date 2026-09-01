# CASA + HAUBERT, site oficial da casa

> **Uma essência. Dois conceitos. Uma conexão que fica.**
> CASA Coffee Colab de dia · HAUBERT Steak & Grillhouse depois das 19h.
> Novo Hamburgo / RS.

Site institucional que faz na tela o que a casa faz no salão às 19h: **muda de
pele**. Modo Dia claro e leve (CASA), modo Noite escuro e quente (HAUBERT),
manifesto, fogo, cultura e reserva em **três toques**.

**Status:** Fase 1 construída e verificada localmente. Oito rotas no ar,
`npm run build` e `npm run check` limpos, 29 testes passando, com fotografia
emprestada das pranchas do deck ([ADR-007](docs/08_DECISOES/adr-007-fotos-do-deck.md)).
**Falta para publicar:** domínio (BLK-006), WhatsApp oficial (BLK-005),
endereço e horários confirmados (BLK-003) e fotos em alta (BLK-002).

---

## Comece por aqui

| Se você quer… | Leia |
|---|---|
| Entender as regras do projeto | [`CLAUDE.md`](CLAUDE.md), a constituição |
| Entender o produto | [`docs/00_VISAO/`](docs/00_VISAO/README.md) |
| Entender a marca | [`brand/BRAND-DNA-EXTRAIDO.md`](brand/BRAND-DNA-EXTRAIDO.md) |
| Entender a arquitetura | [`docs/01_ARQUITETURA/`](docs/01_ARQUITETURA/README.md) + [ADRs](docs/08_DECISOES/) |
| Pintar qualquer coisa | [`docs/02_DESIGN_SYSTEM/`](docs/02_DESIGN_SYSTEM/README.md) |
| Ver o que já existe de componente | [`docs/06_COMPONENTES/`](docs/06_COMPONENTES/README.md) |
| Saber o que fazer agora | [`docs/09_BACKLOG/`](docs/09_BACKLOG/README.md) |
| Rodar localmente | [`INSTALACAO.md`](INSTALACAO.md) |

## Estrutura

```
CLAUDE.md              constituição do projeto, leia antes de qualquer mudança
brand/                 o guia SOCIAL DNA original + a extração de marca
memory/                identidade · decisões · padrões · aprendizados · restrições · bugs
docs/00_→11_           visão → arquitetura → design system → … → segurança
supabase/              schema.sql (fonte de verdade), migrations, seeds
src/
  constants/casa.ts    o seed da casa, único lugar onde "HAUBERT" é dado
  lib/                 camada de serviços: casa, horário, reservas, modo, supabase
  styles/              tokens.css (as duas paletas) + global.css (ponte Tailwind)
  layouts/Base.astro   <head>, script de tema anti-FOUC, schema.org
  assets/marca/        as fotos recortadas das pranchas (npm run marca:recortar)
  components/          shared/ (cromo) + secoes/ (blocos de página)
  pages/               8 rotas
```

## Rotas

| Rota | O que é |
|---|---|
| `/` | Home, o funil inteiro, do hero à reserva |
| `/noite` | HAUBERT, com o modo Noite forçado. É o link da bio do @haubert.steakhouse |
| `/sobre` | O manifesto longo, os pilares, o compromisso |
| `/fogo` | Os 5 elementos do método e os 6 cortes |
| `/cultura` | Música, arte, cidade e os quatro encontros da casa |
| `/contato` | Horários, canais e reserva |
| `/privacidade` | Aviso LGPD (`noindex`) |
| `/404` | Erro com quatro saídas (`noindex`) |

## Stack

**Astro 7** (`output: 'static'` + adapter Vercel) · **Tailwind v4** via
`@tailwindcss/vite` · **Supabase** (Postgres + RLS + Auth + Storage) a partir da
Fase 2 · deploy **Vercel**.

**A Fase 1 envia 7 KB de JavaScript**, nenhuma ilha React, fotos incluídas
(`<Image>` do Astro resolve tudo no build). O alternador e a
folha de reserva são HTML nativo (`<details>`, radios) com script curto; o
estado visual do tema é CSS derivado de `[data-modo]`, então já está correto no
primeiro frame.

O porquê está no [ADR-001](docs/08_DECISOES/adr-001-stack-astro-supabase.md) e
no [ADR-006](docs/08_DECISOES/adr-006-fase1-sem-react.md).

## As três regras que não se negociam

1. **Reservar custa no máximo 3 toques** a partir de qualquer tela
2. **Cor, nome e copy de marca vêm do dado**, nunca do código, `#131212` escrito num componente é bug
3. **RLS é definição de pronto**, tabela sem policy não entra em `main`

## Comandos

```bash
npm install && npm run dev
```

`npm run build` · `npm run check` (tipos) · `npm run test` (Vitest).

## O que ainda depende do cliente

A lista viva está em [`memory/bugs.md`](memory/bugs.md). Enquanto não chegam, o
site **não inventa**: sem endereço confirmado ele mostra só "Novo Hamburgo · RS"
e explica que a equipe manda a localização na conversa; sem WhatsApp, a reserva
degrada para o Instagram da marca ativa, que é onde a casa já vive.

endereço e horário oficiais · WhatsApp de reserva · acervo de fotos em alta ·
logos em SVG · domínio.
