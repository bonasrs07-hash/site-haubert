# 08 — DECISÕES · CASA + HAUBERT — site oficial da casa

> ADRs (Architecture Decision Records): por que escolhemos X em vez de Y.

## O que vive aqui

- **ADRs**: decisões técnicas formalizadas (status, contexto, alternativas, consequências)
- **Ciclo de vida**: Proposto → Aceito → Supersedido
- **Arquivo**: um ADR por arquivo (`adr-NNN-titulo.md`)
- **Histórico**: decisões antigas/supersedidas ficam, marcadas como "Supersedido por"
- **Rastreabilidade**: quando foi decidido, quem decidiu, qual código implementa

## O que NÃO vive aqui

- Implementação da decisão → `src/`
- Especificações de API → `07_APIS/`
- Regras de negócio → `03_REGRAS_DE_NEGOCIO/`
- Fluxos → `05_FLUXOS/`

## As decisões deste projeto

| ADR | Decisão | Status |
|---|---|---|
| [001](adr-001-stack-astro-supabase.md) | Astro + Tailwind + Supabase + Vercel, `output: 'static'` com adapter | aceito |
| [002](adr-002-multi-tenant-white-label.md) | Multi-tenant desde a linha 1 — tenant é a casa, marcas são linhas dentro dela | aceito |
| [003](adr-003-tipografia-substituta.md) | Substitutas gratuitas no lugar da Druk, que é paga | aceito |
| [004](adr-004-modo-dia-noite.md) | O modo vive em `[data-modo]` no `<html>`, com script inline anti-FOUC | aceito |
| [005](adr-005-reserva-whatsapp-fase1.md) | Reserva por WhatsApp na Fase 1; nativa só na Fase 3 | aceito |
| [006](adr-006-fase1-sem-react.md) | Zero React no cliente na Fase 1 — 7 KB de JS no lugar de 45 | aceito |
| [007](adr-007-fotos-do-deck.md) | As fotos saem das pranchas do deck, como empréstimo até o BLK-002 | aceito, com validade |

`adr-000-template.md` é o molde: copie para abrir um novo.

## Como preencher

1. **Copie `adr-000-template.md`**: renomeie para `adr-NNN-titulo.md`
2. **Preencha todas as seções**: Contexto, Decisão, Alternativas, Consequências
3. **Status começa "Proposto"**: aprovação → "Aceito", depois → "Supersedido"
4. **Não delete ADRs antigos**: marque como "Supersedido por adr-NNN", arquivo fica no histórico
5. **Atualize quando decisão muda**: novo ADR que supersede, link bidirecional

## Ligações

- `adr-000-template.md` — comece aqui, clone para novo ADR
- `01_ARQUITETURA/` — ADRs justificam as escolhas técnicas
- `03_REGRAS_DE_NEGOCIO/` — se regra é decisão técnica, document em ADR
