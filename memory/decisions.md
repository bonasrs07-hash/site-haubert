# Decisões de Arquitetura, CASA + HAUBERT

## Objetivo
- Registrar todas as decisões arquiteturais e de produto relevantes
- Evitar re-discussão de problemas já resolvidos
- Documentar trade-offs e contexto de cada decisão

## Contexto
- Os ADRs vivem em `docs/08_DECISOES/` (markdown)
- Cada ADR tem ID sequencial (ADR-001, ADR-002, ...)
- ADRs são imutáveis após merge; novos ADRs supersedem os antigos

## Regras Gerais
- Toda decisão de arquitetura, stack ou produto vira ADR
- Decisão = mudança que afeta 2+ componentes ou tem ciclo de vida longo
- Bug pequeno e refactor local não viram ADR
- ADR sobrescreve doc divergente; ADR é fonte de verdade

## Validações
- ADR tem contexto claro (problema, alternativas, consequências)?
- Decisão foi discutida com o dono do produto?

## Permissões
- Qualquer dev pode propor ADR
- Dono/tech lead (Matheus Bonato): aprova merge

## Exceções
- ADR de urgência máxima (segurança, compliance) pode ser escrito pós-deploy com tag `[URGENT]`

## Auditoria
- Revisar ADRs a cada início de fase contra a realidade da codebase

## Eventos
- `decision.proposed`, `decision.superseded`, `decision.reviewed`

## Configurações Futuras
- Validação automática de formato de ADR no CI

## Casos de Uso
- "Por que Astro e não React puro, se o padrão da casa é React?"
- "Por que a reserva da Fase 1 é WhatsApp e não formulário no banco?"
- "Por que não estamos usando Druk, se o guia manda?"

## Critérios de Aceite
- [x] Índice abaixo em sync com `docs/08_DECISOES/`
- [x] Cada ADR tem Status e Data
- [ ] ADRs obsoletos com link para sucessor (nenhum obsoleto ainda)

---

## O que é um ADR?

Architecture Decision Record captura uma escolha arquitetural significativa, as
alternativas consideradas e as consequências. Formato Michael Nygard:

- **Status**: Proposed / Accepted / Superseded / Rejected / Deprecated
- **Contexto**: por que estamos fazendo isso? Qual problema?
- **Decisão**: o que decidimos?
- **Alternativas consideradas**: o que mais pensamos?
- **Consequências**: o que muda? Trade-offs?

## Índice de ADRs

| ID | Título | Status | Data | Supersede / Supersedido por |
|---|---|---|---|---|
| [ADR-001](../docs/08_DECISOES/adr-001-stack-astro-supabase.md) | Stack: Astro (static + adapter) + Tailwind + Supabase + Vercel | Accepted | 2026-08-24 | ajustado por ADR-006 |
| [ADR-002](../docs/08_DECISOES/adr-002-multi-tenant-white-label.md) | Multi-tenant por casa, marca como dado (white-label) | Accepted | 2026-08-24 |, |
| [ADR-003](../docs/08_DECISOES/adr-003-tipografia-substituta.md) | Tipografia: substitutas gratuitas para Druk até decisão de compra | Accepted | 2026-08-24 |, |
| [ADR-004](../docs/08_DECISOES/adr-004-modo-dia-noite.md) | Modo Dia/Noite como troca de tema por token, não como duas rotas | Accepted | 2026-08-24 |, |
| [ADR-005](../docs/08_DECISOES/adr-005-reserva-whatsapp-fase1.md) | Reserva por WhatsApp na Fase 1, nativa na Fase 3 | Accepted | 2026-08-24 |, |
| [ADR-006](../docs/08_DECISOES/adr-006-fase1-sem-react.md) | Fase 1 sem React no cliente (7 KB de JS no total) | Accepted | 2026-08-24 | ajusta ADR-001 |

## Regra Principal

> Toda decisão de arquitetura/produto que afeta 2+ sistemas ou tem ciclo de vida
> maior que uma fase vira um ADR. Sem exceção.

Propostas vão em `docs/08_DECISOES/` como `adr-NNN-titulo-da-decisao.md`.
Numeração sequencial, única, nunca reciclada.

## Template para novo ADR

Copiar de `docs/08_DECISOES/adr-000-template.md`.

## Como Contribuir

1. Propor ADR em `docs/08_DECISOES/adr-NNN-titulo.md`
2. Solicitar revisão do dono
3. Discutir alternativas
4. Merge quando houver consenso
5. **Atualizar o índice acima**, ADR fora do índice é ADR perdido

## Decisões Supersedidas / Em Review

- Nenhuma superseção até o momento.
- **Em revisão:** compra da licença Druk (ADR-003) e escolha do domínio.
