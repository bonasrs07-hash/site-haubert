# 04, Modelagem de Dados

> Fonte de verdade executável: [`supabase/schema.sql`](../../supabase/schema.sql).
> Decisão de multi-tenancy: [ADR-002](../08_DECISOES/adr-002-multi-tenant-white-label.md).

## A pergunta que define tudo: qual é a unidade de isolamento?

Não é a marca. CASA e HAUBERT dividem endereço, equipe, cozinha e reserva, se
cada uma fosse um tenant, tudo que importa seria cross-tenant, que é exatamente o
que a RLS existe para impedir.

**A unidade de isolamento é a CASA (`venue`).** Marca é um atributo dela.

```
venues  (tenant, isolamento e RLS)
  ├── brands            CASA (dia) · HAUBERT (noite)
  │     ├── menu_sections → menu_items
  │     └── events
  ├── reservations      pertence à casa, referencia a marca
  └── venue_members     quem pode editar no painel
```

## Entidades

### `venues`, a casa
O tenant. Guarda o que é físico e compartilhado: endereço, telefone, WhatsApp,
coordenadas (para schema.org e Google Maps) e as feature flags.

`features` (JSONB) já prevê `reserva_nativa`, `cardapio_dinamico`, `agenda`,
todas `false` na Fase 1. A flag existe antes do recurso para que ligar não exija
deploy de código.

### `brands`, a identidade
Onde mora o white-label. Três colunas fazem o trabalho pesado:

| Coluna | O que carrega | Consumido por |
|---|---|---|
| `tokens` (JSONB) | Paleta e fontes da marca | mesmo formato de `src/styles/tokens.css`, injetado no `<head>` na Fase 2 |
| `copy` (JSONB) | Mote, manifesto, frases proprietárias | Seções institucionais |
| `horario` (JSONB) | Faixas por dia da semana | Rodapé, "aberto agora", schema.org |

`modo` (`'dia' | 'noite'`) é o que amarra a marca ao tema (ADR-004).

> **JSONB não tem checagem de tipo.** Validar `tokens` e `copy` com Zod na
> camada de serviços, com um default de fallback se o shape vier errado.
> Site sem cor é pior que site com cor antiga.

### `menu_sections` / `menu_items`
Cardápio por marca, os cortes são do HAUBERT, os cafés são da CASA.
`publicado` controla o rascunho: a equipe monta o cardápio novo sem que ele
apareça. `preco_cents` é **integer em centavos** e aceita nulo (na Fase 1 o preço
não é divulgado, BLK-004).

### `events`
Agenda de eventos, DJs e collabs (In The Flow, Resenha, Bons Tempos, Matcha
Club). `brand_id` é opcional: existe evento da casa inteira. `lineup` é
`text[]`, array simples resolve; tabela de artista só quando houver página de artista.

### `reservations`
**Nasce na Fase 0, entra em uso na Fase 3.** A tabela existe desde já para que a
política de acesso e a retenção sejam decididas *antes* de existir dado pessoal
dentro dela, e não depois, sob pressão de entrega.

Marcações de LGPD no schema:
- Comentário de tabela declara base legal (execução de contrato) e retenção (12 meses)
- `anonimizada_em` permite o job de retenção sem apagar a linha estatística
- **Nenhuma policy de INSERT para `anon`**: escrita passa por endpoint de servidor com validação

### `venue_members`
Liga `auth.users` à casa com papel (`dono` | `editor`). É a tabela que a função
`e_membro_da_casa()` consulta em toda policy de escrita.

## Regras de modelagem

1. **Toda tabela de domínio tem `venue_id`.** Inclusive quando dá para chegar
   nele por JOIN, a policy precisa dele direto, sem subconsulta cara.
2. **RLS é criada na mesma migration da tabela** *(P-005)*.
3. **Dinheiro é `integer` em centavos.** `numeric` para coordenada, nunca `float` para preço.
4. **`publicado` em tudo que é conteúdo.** A equipe precisa poder rascunhar.
5. **`slug` é único por casa**, não global, a Fase 4 tem várias casas.
6. **Timestamps sempre `timestamptz`.** O site fala de horário de funcionamento;
   fuso implícito é bug esperando acontecer.

## Isolamento, como se prova

A policy sozinha não é prova. O teste é:

```sql
-- Com o JWT de um editor da casa A, ler dados da casa B.
-- Resultado esperado: ZERO linhas. Qualquer outra coisa é vazamento.
set request.jwt.claims = '{"sub":"<user-da-casa-A>","role":"authenticated"}';
select count(*) from public.reservations where venue_id = '<casa-B>';  -- deve ser 0
```

Esse teste roda no CI e é bloqueio de merge, ver
[`docs/11_SEGURANCA/`](../11_SEGURANCA/README.md).

## Seeds

`supabase/seeds/` recebe:
1. A casa de Novo Hamburgo (`venues`)
2. As duas marcas com `tokens` espelhando `tokens.css` e `copy` vinda de `brand/`
3. As seções e os 6 cortes já nomeados no guia (Ancho, Rib Eye, T-Bone, Picanha,
   Filé Mignon, Brisket), sem preço
4. Os eventos recorrentes do guia (In The Flow, Resenha, Bons Tempos, Matcha Club)

> Seed é o único lugar do código de aplicação onde a palavra "HAUBERT" pode
> aparecer como dado *(P-003)*.

## Storage

Bucket `midia`, caminho `venues/{venue_id}/{brand_slug}/{arquivo}`.
Leitura pública; escrita só para membro da casa. O caminho carrega o `venue_id`
para que a policy de Storage siga o mesmo isolamento das tabelas.

## O que ainda não está modelado (de propósito)

| Fora de escopo | Quando entra |
|---|---|
| Pedido / delivery | Nunca (`docs/00_VISAO`, o que o produto não é) |
| Pagamento | Só se houver gift card (exige ADR novo) |
| Mesas e layout de salão | Fase 3+, se a reserva nativa precisar de controle de lotação |
| Newsletter | Fase 2, tabela própria, com consentimento explícito e separado |
| Programa de fidelidade | Fase 4+ |
