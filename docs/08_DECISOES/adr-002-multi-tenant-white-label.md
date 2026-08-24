# ADR-002: Multi-tenant por casa, marca como dado (white-label)

## Status
Accepted — 2026-08-24

## Contexto

O cliente é **um só** — a casa de Novo Hamburgo. A tentação óbvia é modelar
single-tenant e hardcodar tudo. Três fatos empurram na direção oposta:

1. **A casa já é duas marcas.** CASA Coffee Colab e HAUBERT Steak & Grillhouse
   dividem endereço, equipe e cozinha, mas têm paleta, tipografia, tom de voz,
   horário e cardápio próprios. Se a marca for hardcodada, o site vira dois
   sites colados com `if (noite)` espalhado pelo código.
2. **O roadmap prevê empacotar isso como produto** (Fase 4). Cada
   "steakhouse com café de dia" do Sul é um cliente potencial do mesmo template.
   Retrofit de multi-tenancy custa muito mais caro do que nascer assim.
3. **A restrição de white-label é padrão da casa** (`CLAUDE.md`): nada de marca,
   nome, cor, logo ou regra de cliente hardcodada.

A pergunta que resolve o desenho é: *qual é a unidade de isolamento?* Não é a
marca — CASA e HAUBERT compartilham reservas, equipe e endereço. É a **casa**.

## Decisão

**Tenant = `venue` (a casa).** Dentro de uma `venue` existem N `brands`.

```
venues (tenant)                 ← unidade de isolamento e de RLS
  └── brands                    ← CASA, HAUBERT (paleta, fontes, copy, horário)
        ├── menu_sections → menu_items
        └── events
  └── reservations              ← pertence à casa, referencia a marca
  └── venue_members             ← quem pode editar no painel
```

Regras que decorrem:

1. **Toda tabela de domínio carrega `venue_id`** e tem RLS obrigatória filtrando
   por ele. Sem exceção, inclusive em tabela de leitura pública.
2. **A identidade visual é linha de tabela, não constante de código.**
   `brands.tokens` (JSONB) guarda cores, fontes e raio; a aplicação injeta isso
   como CSS custom properties no `<head>`. Ver ADR-004.
3. **Copy institucional também é dado.** Mote, manifesto, frases proprietárias e
   horário vivem em `brands`, não em string literal no `.astro`.
4. **Nenhum componente conhece o nome "HAUBERT".** Ele recebe `brand` e renderiza.
   Um `grep -i haubert src/` só pode dar match em seed, config e conteúdo —
   nunca em componente.
5. **Feature flags por tenant** (`venues.features` JSONB) já previstas, mesmo
   sem uso na Fase 1: `reserva_nativa`, `cardapio_dinamico`, `agenda`.
6. **Sem planos (free/pro) na Fase 1.** A coluna existe, o billing não.

## Alternativas Consideradas

**Single-tenant, marca hardcodada**
- Prós: mais simples e mais rápido para entregar a Fase 1
- Contras: mata a Fase 4; e mesmo dentro deste cliente, as duas marcas geram
  condicional espalhada. Reprovado

**Tenant = marca** (CASA e HAUBERT como dois tenants)
- Prós: isolamento máximo entre as duas identidades
- Contras: reserva, equipe, endereço e fotos são compartilhados — passariam a
  precisar de duplicação ou de tabela cross-tenant, que é exatamente o que a RLS
  deveria impedir. Reprovado

**Um banco (ou schema) por cliente**
- Prós: isolamento físico forte, atraente para enterprise
- Contras: N migrations para manter, custo por projeto no Supabase, e o tier
  gratuito não comporta. Fica registrado como caminho para um cliente que exija
  isolamento contratual

## Consequências

**Positivas**
- A troca Dia/Noite deixa de ser condicional e vira troca de registro de marca
- A Fase 4 (produto para outras casas) passa a ser trabalho de seed + domínio,
  não de refactor
- Segurança melhora por construção: RLS por `venue_id` é uma regra só, testável

**Negativas / riscos**
- **Custo inicial maior**: JOIN a mais, seed a escrever, policies a manter, para
  um cliente só. Aceito conscientemente
- **Risco de vazamento entre tenants** se alguma policy for esquecida.
  Mitigação: RLS é definição de pronto + teste automatizado que tenta ler dado de
  outra `venue` com token de usuário comum e **espera zero linha**
- **Tokens em JSONB não têm checagem de tipo do Postgres.** Mitigação: validar o
  shape com Zod na camada de serviços e ter um token default de fallback

## Referências
- `docs/04_MODELAGEM/README.md` — schema e policies
- `docs/11_SEGURANCA/README.md` — teste de isolamento
- ADR-004 — a troca Dia/Noite consumindo `brands.tokens`
