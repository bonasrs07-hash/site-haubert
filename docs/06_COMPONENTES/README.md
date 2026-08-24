# 06 — COMPONENTES · CASA + HAUBERT — site oficial da casa

> Catálogo vivo de componentes UI em atomic design. Um lugar, uma versão.

**Status: Fase 1 construída.** Catálogo abaixo em sync com `src/components/`.
A regra de [P-002](../../memory/patterns.md) vale: componente nasce `.astro`;
vira ilha React só com justificativa no PR — e a Fase 1 fechou **sem nenhuma**
([ADR-006](../08_DECISOES/adr-006-fase1-sem-react.md)).

### Catálogo — Fase 1

| Componente | Arquivo | Interativo? | Estados |
|---|---|---|---|
| `Base` (layout) | `src/layouts/Base.astro` | script inline de tema | — |
| `Cabecalho` | `src/components/shared/Cabecalho.astro` | scroll + menu `<details>` | topo / rolado, menu aberto / fechado |
| `AlternadorModo` | `src/components/shared/AlternadorModo.astro` | sim | dia ativo / noite ativo, foco |
| `BotaoReserva` | `src/components/shared/BotaoReserva.astro` | sim | fechado / aberto, canal WhatsApp / telefone / Instagram |
| `BarraReserva` | `src/components/shared/BarraReserva.astro` | sim | aberto / fechado / horário não confirmado |
| `Rodape` | `src/components/shared/Rodape.astro` | não | — |
| `Hero` | `src/components/secoes/Hero.astro` | não (CSS troca o mote) | dia / noite |
| `HeroPagina` | `src/components/secoes/HeroPagina.astro` | não | — |
| `CabecalhoSecao` | `src/components/secoes/CabecalhoSecao.astro` | não | início / centro, h1 / h2 |
| `Faixa` | `src/components/secoes/Faixa.astro` | não | normal / destaque, parada com reduced-motion |
| `GradeEixos` | `src/components/secoes/GradeEixos.astro` | não | 2 / 3 colunas, numerada ou não |
| `DuasCulturas` | `src/components/secoes/DuasCulturas.astro` | sim (cartão acende o modo) | dia aceso / noite aceso |
| `Manifesto` | `src/components/secoes/Manifesto.astro` | não | com / sem compromisso |
| `Fogo` | `src/components/secoes/Fogo.astro` | não | com / sem chamada |
| `Cortes` | `src/components/secoes/Cortes.astro` | não | — |
| `Cultura` | `src/components/secoes/Cultura.astro` | não | com / sem eixos |
| `ChamadaReserva` | `src/components/secoes/ChamadaReserva.astro` | contém `BotaoReserva` | — |
| `Foto` | `src/components/shared/Foto.astro` | não | com / sem véu; véu acompanha o modo |
| `TiraFotos` | `src/components/secoes/TiraFotos.astro` | não | rolagem lateral < 64rem, grade de 6 acima |
| `BandaFoto` | `src/components/secoes/BandaFoto.astro` | não | `larga` / `lado` |

### Invariantes verificados no browser

- Nenhum scroll horizontal em 375px nem em 1440px
- Um único `<h1>` por página, sem salto de nível (h1 → h2 → h3)
- `Esc` fecha o painel de reserva e devolve o foco ao gatilho
- Alvos de toque ≥ 44px, exceto links embutidos em parágrafo (exceção WCAG 2.5.8)
- `[[PENDENTE]]` nunca chega ao HTML servido

## O que vive aqui

- **Atoms**: botão, campo de texto, label, checkbox, etc.
- **Molecules**: form, card, modal, toast, alert
- **Organisms**: tabela com paginação, navbar, sidebar, pedido-form
- **Templates**: layout de página, variações por contexto (mobile/desktop)
- **Estados**: default, loading, error, success, disabled
- **Acessibilidade**: ARIA labels, keyboard nav, contrast ratios
- **Testes**: snapshot, interação, a11y

## O que NÃO vive aqui

- Código real → `src/components/`
- Design tokens → `02_DESIGN_SYSTEM/`
- Regras de quando mostrar → `03_REGRAS_DE_NEGOCIO/`
- Fluxos de interação → `05_FLUXOS/`

## Arquivos sugeridos

- `atoms.md` — botão, input, label, icon, badge (+ screenshots)
- `molecules.md` — formgroup, card, modal, toast, badge-group
- `organisms.md` — tabela, navbar, sidebar, form complexa
- `templates.md` — página de listagem, página de detalhe, modal workflow
- `estados.md` — loading, error, success, disabled, focus
- `ACCESSIBILITY.md` — checklist: keyboard, screenreader, contrast

## Como preencher

1. **Design System primeiro**: componentes nascem em `02_DESIGN_SYSTEM/`
2. **Atomic design**: breaking up UI into atoms/molecules/organisms
3. **Código separado de design**: JSX em `src/`, documentação aqui
4. **Componentes reutilizáveis**: se aparecer 2x, é componente
5. **Teste = documentação**: teste é prova de que componente funciona
6. **White-label**: componentes não assumem tenant específico (tokens, sim)

## Ligações

- `02_DESIGN_SYSTEM/` — tokens, cores, tipografia
- `src/components/` — código real dos componentes
- CLAUDE.md — regra: CSS separado do JSX (decisão 018)
