# Padrões Consolidados, CASA + HAUBERT

> "Como fazemos aqui." Padrão registrado aqui vale mais que preferência pessoal.
> Divergir exige justificativa no PR; divergir sempre vira ADR.

## Objetivo
- Consolidar as decisões repetitivas para não rediscutir a cada PR
- Dar ao próximo dev (ou agente) o modelo mental do repositório em 5 minutos

## Contexto
- Stack: Astro híbrido + Tailwind + Supabase + Vercel (ADR-001)
- Multi-tenant por casa, marca como dado (ADR-002)

## Regras Gerais
- Padrão novo nasce de repetição observada (3+ vezes), não de gosto
- Padrão que virou obstáculo é revogado, não contornado em silêncio

## Validações
- O padrão tem exemplo de código concreto?
- Está claro quando **não** aplicá-lo?

## Permissões
- Qualquer dev propõe; tech lead consolida

## Exceções
- Protótipo descartável pode ignorar; código que vai para `main` não

## Auditoria
- Revisar a cada início de fase

## Eventos
- `pattern.created`, `pattern.deprecated`

## Casos de Uso
- "Onde eu coloco essa consulta ao Supabase?"
- "Isso vira ilha React ou fica em Astro?"

## Critérios de Aceite
- [x] Cada padrão tem o "quando não usar"
- [x] Exemplos são deste projeto, não genéricos

---

## P-001, Toda leitura do banco passa por `src/lib/`

**O padrão.** Componente (`.astro` ou `.tsx`) nunca importa o cliente Supabase.
Ele chama uma função da camada de serviços, que devolve dado já no formato da UI.

```
src/lib/
  supabase.ts        // criação do cliente (anon no browser, server-side à parte)
  venues.ts          // buscarCasa(slug)
  brands.ts          // buscarMarcas(venueId), buscarTokens(brandId)
  menu.ts            // buscarCardapio(brandId)
  events.ts          // buscarAgenda(venueId, { de, ate })
```

**Por quê.** É o único ponto que conhece o backend. Trocar de provedor, adicionar
cache ou mudar o shape do dado mexe em um arquivo, não em vinte.

**Quando não usar.** Nunca. Não há exceção.

---

## P-002, Astro por padrão, ilha React só quando o runtime se paga

**O padrão.** Conteúdo é `.astro` e envia zero JS. Vira ilha React quando há
**estado assíncrono real**, envio, erro por campo, confirmação, lista que muda
sozinha. "Tem interação" não basta.

**Onde a Fase 1 parou.** Nenhuma ilha. As duas peças interativas saíram em
HTML nativo + script curto ([ADR-006](../docs/08_DECISOES/adr-006-fase1-sem-react.md)):

| Peça | Como saiu |
|---|---|
| Alternador Dia/Noite | dois `<button>` + um listener; o estado ativo é CSS a partir de `[data-modo]` |
| Folha de reserva | `<details>` + `<input type="radio">` + `<label>`; o script só reescreve o `href` |
| Sinal "aberto agora" | script lê as faixas de um `data-` e calcula no fuso da casa |

**Por quê.** Orçamento de JS da home: **< 60 kb** (`memory/restrictions.md`).
`react` + `react-dom` custam ~45 kb gzip, três quartos do orçamento para duas
interações sem estado assíncrono. **Medido no build: 7 KB, 11% do orçamento.**

**Quando não usar.** Se dá para resolver com CSS ou HTML nativo (`:hover`,
`:target`, `details/summary`, radio + `:checked`, scroll-snap), resolve com
isso. A pergunta não é "é complexo?", é "o runtime custa menos que o que ele
resolve?".

**Armadilha do Astro.** O `<script>` de um componente é deduplicado: usado duas
vezes na mesma página, ele roda **uma vez só**. Sempre `querySelectorAll` +
`forEach`, nunca `querySelector` assumindo instância única.

---

## P-003, A marca vem do dado, nunca do código

**O padrão.** Componente recebe `brand` e renderiza. Não existe
`if (marca === 'haubert')` na UI.

```astro
---
// ✅
const { brand } = Astro.props;
---
<section style={`--cor-acento: ${brand.tokens.acento}`}>
  <p class="eyebrow">{brand.mote}</p>   <!-- "Fogo. Força. Tradição." -->
</section>
```

```astro
<!-- ❌ nunca -->
{marca === 'haubert' && <h2 style="color:#631F15">Fogo. Força. Tradição.</h2>}
```

**Por quê.** ADR-002. Uma terceira marca (ou uma segunda casa) tem que ser uma
linha de `INSERT`, não um `else if`.

**Quando não usar.** Nunca no código de aplicação. Seed, migration e conteúdo
podem nomear marcas.

---

## P-004, Cor só por token semântico

**O padrão.** `var(--cor-superficie)`, nunca `#131212`; e nunca o token bruto
(`var(--haubert-carvao)`) num componente, o bruto é para `tokens.css` resolver.

**Por quê.** É o que faz a troca Dia/Noite funcionar sem tocar em componente.

**Quando não usar.** `tokens.css` é o único arquivo onde hex literal é legítimo.

---

## P-005, RLS antes do primeiro `INSERT`

**O padrão.** A migration que cria a tabela cria a policy na mesma migration.
Nunca "depois eu ligo a RLS".

```sql
alter table public.reservations enable row level security;

create policy "reserva visível só para a equipe da casa"
  on public.reservations for select
  using (venue_id in (select venue_id from public.venue_members where user_id = auth.uid()));
```

**Por quê.** Tabela sem RLS no Supabase é tabela pública. É o modo de falha mais
comum da stack.

**Quando não usar.** Nunca.

---

## P-006, Copy sai de `brand/`

**O padrão.** Antes de escrever qualquer frase visível, procure em
`brand/BRAND-DNA-EXTRAIDO.md` §2. O guia já tem manifesto, mote e frases
proprietárias prontos.

**Por quê.** A marca já existe e custou dinheiro. Copy inventada pelo dev
enfraquece o que foi construído.

**Quando não usar.** Microcopy funcional (rótulo de campo, mensagem de erro)
pode ser escrita, desde que no tom documentado em `memory/identity.md`.

---

## P-007, Nomes: domínio em português, técnico em inglês

```ts
// ✅
export async function buscarCardapio(brandId: string) { … }
const handleSubmit = () => { … };

// ❌
export async function fetchMenu(brandId: string) { … }
const aoEnviar = () => { … };
```

**Por quê.** O domínio é conversa com o cliente (cardápio, reserva, casa, marca);
o técnico é conversa com a plataforma.

---

## P-008, Imagem sempre por `astro:assets`

**O padrão.** `<Image />` do Astro, com `widths`, `formats={['avif','webp']}` e
`loading="lazy"` abaixo da dobra. `<img src="/foto.jpg">` cru não passa em review.

**Por quê.** Foto é 90% do peso deste site, e o público está em 4G.

---

## P-009, Estados sempre presentes

Toda superfície que depende de dado nasce com os quatro estados:
**carregando · vazio · erro · sucesso**. O estado vazio tem copy da marca, não
"Nenhum resultado encontrado".

> ✅ *"A agenda da semana ainda está sendo escrita. Volta amanhã."*
> ❌ *"Nenhum evento encontrado."*
