# ADR-004: Modo Dia/Noite como troca de tema por token, não como duas rotas

## Status
Accepted — 2026-08-24

## Contexto

O conceito central do guia SOCIAL DNA é literal:

> *"Mesma casa. Nova atmosfera. Outra experiência."* — **After 7, CASA é HAUBERT.**

O mesmo endereço muda de identidade às 19h: paleta clara e leve (CASA) vira
paleta escura e quente (HAUBERT); o tom passa de "próximo e convidativo" para
"confiante e direto"; muda o cardápio, o horário e a trilha.

Isso precisa virar interface. Três formas de fazer isso:

- **A.** Dois sites / dois domínios
- **B.** Duas rotas no mesmo site (`/casa` e `/haubert`)
- **C.** Um site que troca de pele

O intake escolheu **um site com modo Dia/Noite**. Falta decidir *como* isso se
materializa no código — e essa decisão define se o site fica elegante ou vira um
emaranhado de condicionais.

## Decisão

**O modo é um atributo no elemento raiz (`data-modo="dia" | "noite"`) que
reescreve tokens CSS. Não é rota, não é duplicação de componente, não é
condicional em JSX.**

Mecânica:

1. **`brands.tokens` (JSONB, ADR-002)** carrega a paleta e as fontes de cada marca
2. No `<head>`, o servidor injeta os dois conjuntos de tokens como CSS custom
   properties, sob `[data-modo="dia"]` e `[data-modo="noite"]`
3. **Um script inline, antes da primeira pintura**, define `data-modo` a partir
   de, nesta ordem: preferência salva (`localStorage`) → hora local do visitante
   (≥19h ou <5h = noite) → padrão `dia`. Inline e síncrono para evitar FOUC
4. **Toda a UI usa apenas os tokens.** Um componente não sabe se é dia ou noite;
   ele pinta com `var(--cor-superficie)` e o token resolve
5. **A ilha React da troca** só escreve `data-modo` e persiste a escolha. Ela não
   re-renderiza a página
6. **Conteúdo específico da marca** (cortes × cafés, agenda da noite × do dia)
   vem por consulta filtrada por `brand_id`, em rota SSR — não por `display:none`
   em conteúdo duplicado
7. **URL reflete a escolha** via `?modo=noite` para links compartilháveis e para
   o crawler. A home canônica indexa o modo Dia; `/noite` é uma rota SSR com
   canônica própria, para não perder SEO da steakhouse

## Alternativas Consideradas

**Dois sites separados (A)**
- Prós: isolamento total de identidade e de SEO
- Contras: dobra o custo de manutenção, divide a autoridade de domínio, e
  destrói o conceito da marca — o valor está justamente em ser *a mesma casa*.
  Reprovado no intake

**Duas rotas com layouts duplicados (B)**
- Prós: simples de entender; cada rota é livre
- Contras: duplicação de componente e de copy; toda mudança vira duas mudanças;
  e o momento "a casa muda na sua frente" — que é o *aha moment* do produto —
  desaparece. Reprovado

**Toggle puramente client-side com re-render React**
- Prós: familiar
- Contras: exigiria hidratar a página inteira para trocar cor, contra o
  orçamento de JS do ADR-001. Reprovado

**Modo forçado só pela hora, sem toggle**
- Prós: mais "mágico" e fiel ao conceito
- Contras: quem quer ver o cardápio da noite às 10h da manhã fica sem saída.
  Fere o Princípio nº1. Reprovado — a hora define o *padrão*, o usuário decide

## Consequências

**Positivas**
- O conceito da marca vira mecânica de produto — é o que faz o site parecer caro
- Zero duplicação de componente; uma mudança de layout vale para as duas marcas
- Adicionar uma terceira marca (Fase 4) é inserir uma linha em `brands`
- Sem hidratação de página para trocar tema

**Negativas / riscos**
- **FOUC** se o script de tema não for inline e síncrono. Mitigação: está no
  `<head>`, antes de qualquer CSS de componente; registrado em `memory/bugs.md`
- **Contraste precisa passar AA nos dois modos** — dobra a matriz de teste.
  Mitigação: tokens de texto separados dos de superfície + checagem no CI
- **Risco de SEO** se o conteúdo da noite existir só atrás de um toggle
  client-side. Mitigação: `/noite` é rota SSR real, indexável, com canônica
- Cache de CDN precisa variar por `data-modo` quando a rota for SSR. Mitigação:
  a home é estática e neutra; só `/noite` e as rotas dinâmicas variam

## Referências
- `brand/BRAND-DNA-EXTRAIDO.md` §1 — "Duas culturas. Uma casa."
- `docs/02_DESIGN_SYSTEM/README.md` — os dois conjuntos de tokens
- ADR-002 — de onde os tokens vêm
