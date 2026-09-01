# Aprendizados, CASA + HAUBERT

> Memória viva. Erro que não vira aprendizado registrado é erro que volta.
> Registre no momento em que aprendeu, não no fim do projeto.

## Objetivo
- Guardar o que descobrimos, o que quebrou e o que mudou de ideia
- Evitar que o próximo dev (ou agente) repita o mesmo caminho errado

## Contexto
- Projeto em Fase 0. Os aprendizados abaixo vieram da fundação, não de produção

## Regras Gerais
- Aprendizado tem **o que aconteceu**, **por quê** e **o que fazer diferente**
- Aprendizado que virou regra permanente migra para `patterns.md` ou `restrictions.md`

## Validações
- Está escrito de forma que alguém que não estava lá entende?
- Tem consequência prática, ou é só desabafo?

## Permissões
- Qualquer um registra

## Exceções
- Nenhuma

## Auditoria
- Revisar a cada início de fase; promover o que virou padrão

## Eventos
- `learning.recorded`, `learning.promoted`

## Casos de Uso
- "Já tentamos isso antes?"
- "Por que essa decisão parece estranha?"

## Critérios de Aceite
- [x] Cada entrada tem data e consequência prática

---

## 2026-08-24, O vermelho da marca não serve como texto no modo escuro

**O que descobrimos.** O acento tijolo do guia (`#A0361F`) dá apenas **2,7:1**
sobre o carvão `#131212`. Reprova em WCAG AA até para texto grande.

**Por que importa.** O guia foi desenhado para pranchas impressas em fundo osso,
onde o mesmo vermelho dá 6,1:1. Aplicar a paleta de impressão direto na web, sem
recalcular, teria produzido um site bonito e ilegível, exatamente no modo
HAUBERT, que é o mais importante à noite.

**O que fazemos.** O modo Noite usa `--tijolo-claro` (`#D9553A`, 4,8:1) para
texto, e reserva a brasa `#631F15` para preenchimento com texto osso por cima
(10,6:1). Documentado em `docs/02_DESIGN_SYSTEM/README.md` §1.3.

**Regra que nasceu daí.** Toda cor de guia de marca é **verificada** antes de
virar token. Guia de marca é para impressão até que se prove o contrário.

---

## 2026-08-24, O ZIP de marca não tinha o que o nome prometia

**O que aconteceu.** O arquivo veio nomeado "Color Palette 2..14", 13 PNGs de
5MB. Não eram paletas: eram as **16 pranchas do guia SOCIAL DNA completo**
(manifesto, pilares, tom de voz, feed system, campanha, launch grid). Duas
pranchas por arquivo em alguns casos.

**Por que importa.** Se tivéssemos confiado no nome do arquivo, teríamos
extraído cinco hex e jogado fora o manifesto, as frases proprietárias, o tom de
voz por marca e a estrutura de conteúdo, que é 90% do valor do material e o que
sustenta a copy do site inteiro.

**O que fazemos.** Todo insumo de cliente é aberto e lido antes de ser
classificado. A extração fica versionada em `brand/BRAND-DNA-EXTRAIDO.md` para
que ninguém precise reabrir 74MB de PNG.

---

## 2026-08-24, Multi-tenant aqui não é sobre ter muitos clientes

**O que descobrimos.** O reflexo era modelar single-tenant, já que o cliente é
um só. Mas a casa **já é duas marcas** com paleta, tom, horário e cardápio
próprios dividindo o mesmo endereço. Sem `brands` como tabela, o site viraria um
campo minado de `if (noite)`.

**Por que importa.** O multi-tenant se paga já no primeiro cliente, antes
mesmo de existir um segundo. A Fase 4 (produto) vira consequência, não motivo.

**Onde ficou.** ADR-002.

---

## 2026-08-24, A referência visual e o guia da marca combinam por acaso feliz

**O que descobrimos.** Ao inspecionar `disturbancebrands.com`: fundo `#181818`,
texto creme `#FFF8E7`, corpo em **Space Mono**, display em grotesca larga com
tracking de `-0.025em` e line-height `0.9`.

Isso é quase exatamente o que as pranchas do guia HAUBERT já fazem: fundo osso
ou carvão, legendas monoespaçadas em caixa alta com tracking largo, e títulos
condensados pesados com tracking negativo.

**Por que importa.** A referência não precisa ser traduzida para a marca, ela
**já é** a marca em outro meio. Isso reduz o risco de o site parecer uma cópia
do estúdio de referência em vez de parecer a casa.

**O que fazemos.** Copiamos a **estrutura** (ritmo de seção, display gigante,
bloco de estatística, faixa de manifesto) e trocamos toda a pele pelos tokens do
guia. Nenhuma cor, fonte ou frase da referência entra no projeto.

---

## 2026-08-24, As duas interações da Fase 1 não pagavam um runtime de componentes

**O que descobrimos.** O intake previa "ilhas React pontuais". Na hora de
implementar, o alternador Dia/Noite e a folha de reserva revelaram-se: um
`setAttribute` + `localStorage`, e um construtor de URL. Nenhum estado
assíncrono, nenhuma validação por campo, nenhuma lista viva.

`react` + `react-dom` custam ~45 KB gzip. O orçamento inteiro do projeto é
60 KB. As duas interações mais simples do site consumiriam três quartos dele.

**O que fizemos.** `<details>` + `<summary>` + radios + `:checked` para a
reserva; dois `<button>` para o alternador. O estado visual de "qual modo está
ativo" saiu inteiramente em CSS, derivado do `[data-modo]` do `<html>`.

**Resultado medido no build: 7 KB de JS, 11% do orçamento.** E o bônus não
planejado: como o estado ativo é CSS e não JS, o rótulo certo já está pintado no
primeiro frame, não existe janela entre "pintou" e "está correto".

**Por que importa.** A pergunta útil não é "essa interação é complexa?" e sim
"o runtime custa menos do que aquilo que ele resolve?". Aqui não custava.

**Onde ficou.** ADR-006, P-002.

---

## 2026-08-24, O `<script>` de componente Astro roda uma vez, não uma vez por instância

**O que descobrimos.** `BotaoReserva` aparece duas vezes na home (na barra fixa
e na chamada final). O Astro deduplica o `<script>` do componente no bundle,
ele executa **uma vez** para a página inteira, não uma vez por instância.

**Por que importa.** `document.querySelector('[data-reserva]')` teria ligado só
o primeiro painel; o segundo ficaria com o `href` congelado no padrão do
servidor. O bug seria silencioso: o link funciona, só ignora as escolhas.

**O que fazemos.** Todo script de componente começa com `querySelectorAll` +
`forEach`, e cada instância lê a própria configuração de `data-*` em vez de
importar constantes. Serve de fronteira também: foi assim que a barra parou de
arrastar `constants/casa.ts` inteiro, toda a copy do site, para o bundle do
cliente.

**Onde ficou.** P-002.

---

## 2026-08-24, Aba oculta congela transição CSS e finge bug de tema

**O que descobrimos.** Ao verificar a troca Dia/Noite pelo painel do browser, os
tokens mudavam (`--cor-superficie` virava carvão) mas `body` continuava creme, e
`.duas__cartao[data-lado='dia']` continuava aceso. O seletor casava
(`element.matches()` devolvia `true`) e a regra existia no CSSOM.

A causa: `document.visibilityState === 'hidden'`. O Chrome pausa transições CSS
em aba não visível. Tudo que tinha `transition` ficou congelado no valor
anterior; `html`, que não tem transição, saltou na hora. O JS continuou rodando,
o que fazia parecer inconsistência entre CSS e JS.

**O que fazemos.** Ao medir estilo computado com a aba oculta, injetar
`* { transition: none !important }` antes de ler. O que parecia bug de
especificidade era artefato de medição.
