# ADR-006 — A Fase 1 fecha sem React no cliente

- **Status:** aceito
- **Data:** 2026-08-24
- **Substitui:** nada. **Ajusta:** o "ilhas React pontuais" de [ADR-001](adr-001-stack-astro-supabase.md)

## Contexto

O intake definiu a stack como "Astro + Tailwind + ilhas React pontuais". Ao
implementar a Fase 1, as duas peças que pediriam ilha foram:

1. **Alternador Dia/Noite** — troca um atributo no `<html>` e grava em
   `localStorage`.
2. **Folha de reserva** — escolhe número de pessoas e dia, e monta um link.

Nenhuma das duas tem estado assíncrono, lista que cresce, validação com erro
por campo, ou qualquer coisa que justifique um runtime de componentes.

O custo de incluí-las como ilhas era concreto: `react` + `react-dom` são
~45 KB gzipados. O orçamento de JS do projeto é 60 KB
([`docs/01_ARQUITETURA`](../01_ARQUITETURA/README.md)) — ou seja, as duas
interações mais simples do site consumiriam três quartos do orçamento inteiro,
num produto cujo objetivo declarado é SEO local e LCP em 4G.

## Decisão

A Fase 1 é entregue com **zero React no cliente**.

- O alternador é um grupo de dois `<button>` com um listener.
- A folha de reserva é `<details>` + `<summary>` + `<input type="radio">` +
  `<label>`, com um script que reescreve o `href` a cada mudança.
- O estado visual de "qual modo está ativo" é resolvido em CSS, a partir do
  `[data-modo]` do `<html>` — não por JavaScript. Isso é o que faz o rótulo
  certo já estar pintado no primeiro frame, antes de qualquer script.

`@astrojs/react` sai da lista de `integrations` do `astro.config.mjs`. A
dependência **permanece no `package.json`**: a Fase 3 vai precisar dela.

## Consequências

**Boas**

- O site inteiro envia **7 KB de JavaScript** — 11% do orçamento.
- Tudo funciona sem JS: o painel de reserva abre (`<details>` é nativo), as
  opções marcam (radios são nativos) e o link continua válido com o padrão
  renderizado pelo servidor. Só a reescrita do `href` a cada escolha se perde.
- Sem hidratação, não existe janela entre "pintou" e "responde ao clique".

**Ruins**

- É preciso lembrar de usar `querySelectorAll` nos scripts de componente: o
  Astro deduplica o `<script>` de um componente usado duas vezes na mesma
  página, então o script roda uma vez e precisa alcançar todas as instâncias.
- Quando a reserva nativa entrar (Fase 3), haverá dois idiomas de UI no
  repositório por um tempo. É aceitável: eles vivem em rotas diferentes.

## Quando reverter

Quando existir uma tela com **estado assíncrono real** — a reserva nativa da
Fase 3 (envio, erro por campo, confirmação) ou o painel da equipe. Aí a ilha se
paga, e basta devolver `react()` à lista de `integrations`.

O critério não é "a interação é complexa?", é: **o runtime custa menos que o
que ele resolve?** Aqui não custava.
