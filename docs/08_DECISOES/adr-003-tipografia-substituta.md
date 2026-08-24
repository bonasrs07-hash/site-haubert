# ADR-003: Tipografia — substitutas gratuitas para Druk até decisão de compra

## Status
Accepted — 2026-08-24 · **Revisar quando o cliente decidir sobre a licença**

## Contexto

O guia SOCIAL DNA especifica:

- **Títulos:** Bebas Neue / **Druk** (Druk Cond nas pranchas de steak)
- **Texto:** Space Grotesk / Neue Haas Grotesk

Situação de licenciamento:

| Fonte | Licença | Custo web |
|---|---|---|
| Bebas Neue | SIL Open Font License | Grátis |
| Space Grotesk | SIL Open Font License | Grátis |
| **Druk** | Commercial Type, licença comercial | ~US$ 200+ para web |
| Neue Haas Grotesk | Linotype/Monotype, comercial | Pago |

O projeto está em fase bootstrap com a restrição de que **todo item pago é
adiado por padrão** (`memory/restrictions.md`). Ao mesmo tempo, a tipografia é
metade da personalidade visual deste guia: o display condensado, pesado e em
caixa alta é o que faz "HAUBERT" parecer HAUBERT.

Usar Druk sem licença não é opção — é risco jurídico para o cliente.

## Decisão

**Construir o design system com as gratuitas agora, e deixar a troca por Druk
como uma linha de token.**

Pilha tipográfica da Fase 1:

```
--fonte-display : 'Anton', 'Archivo Black', Impact, sans-serif
--fonte-titulo  : 'Bebas Neue', 'Oswald', sans-serif
--fonte-corpo   : 'Space Grotesk', system-ui, sans-serif
--fonte-mono    : 'Space Mono', ui-monospace, monospace
```

- **Anton** (OFL) substitui **Druk** nos títulos-manifesto de peso máximo:
  condensada, muito pesada, ótima em caixa alta com tracking negativo
- **Bebas Neue** (OFL) fica exatamente onde o guia manda — títulos de seção
- **Space Grotesk** (OFL) no corpo, como especificado
- **Space Mono** (OFL) nos micro-labels em caixa alta com tracking largo —
  é o que as próprias pranchas do guia usam nas legendas, e é a mesma família
  de gesto do site de referência (`disturbancebrands.com` usa Space Mono no corpo)

Todas via `@fontsource` (self-hosted, sem chamada ao Google Fonts) para não
vazar IP de visitante para terceiro — ver `docs/11_SEGURANCA/`.

**Trocar por Druk depois custa uma linha**: `--fonte-display: 'Druk Wide Cond'`.
Nenhum componente referencia nome de fonte diretamente.

## Alternativas Consideradas

**Comprar Druk agora (~US$ 200)**
- Prós: fidelidade total ao guia desde o primeiro dia
- Contras: viola a restrição de custo em fase pré-receita, e o cliente ainda não
  aprovou. Fica como decisão pendente do dono da marca

**Usar só Bebas Neue para tudo que é título**
- Prós: uma fonte a menos para carregar
- Contras: Bebas é condensada e leve demais para o gesto de manifesto das
  pranchas ("FIRE", "STEAK", "NIGHT" em peso máximo). Perde impacto

**Fonte variável genérica (Archivo Expanded, Inter Display)**
- Prós: um arquivo, muitos pesos
- Contras: nenhuma delas tem a condensação e o peso do display do guia

## Consequências

**Positivas**
- Zero custo e zero risco jurídico na Fase 1
- Self-hosted → sem request a terceiro, LCP melhor e privacidade preservada
- A migração para Druk é reversível e trivial

**Negativas / riscos**
- **Não é o Druk.** Anton é mais larga e menos refinada; num A/B lado a lado o
  designer da marca vai notar. É uma dívida de fidelidade assumida, registrada
  em `memory/bugs.md` (BLK-007)
- Quatro famílias de fonte pesam. Mitigação: subset latino, `font-display: swap`,
  preload só de display e corpo, e teto de 120kb somados

## Referências
- `docs/02_DESIGN_SYSTEM/README.md` — escala e tokens
- `memory/restrictions.md` — item "Fonte Druk" na tabela de custo
- `brand/BRAND-DNA-EXTRAIDO.md` §4 — o que o guia especifica
