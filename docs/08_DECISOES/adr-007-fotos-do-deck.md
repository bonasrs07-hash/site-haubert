# ADR-007 — As fotos vêm do deck, e o site trata isso como empréstimo

- **Status:** aceito, com validade
- **Data:** 2026-08-24
- **Relacionado:** BLK-002 (acervo fotográfico), [ADR-006](adr-006-fase1-sem-react.md)

## Contexto

A Fase 1 fechou sem uma única fotografia. O acervo do cliente é o BLK-002 e não
tem data. Um site de casa de hospitalidade sem imagem nenhuma resolve o SEO e
falha no trabalho principal: fazer alguém querer estar lá.

O que existe é o guia SOCIAL DNA em `brand/` — 13 pranchas, e dentro delas há
fotografia embutida com qualidade de composição alta.

**Essas imagens são conceito, não registro.** Foram criadas para comunicar
atmosfera numa apresentação de marca. Não fotografam o salão real, a equipe
real, os pratos reais nem a fachada real. Quem olha para elas está vendo a
intenção da casa, não a casa.

## Decisão

As fotos do deck entram no site **como atmosfera e com data de validade**,
sob quatro regras:

1. **Nenhuma legenda afirma que a cena é a casa.** Todo `alt` em
   `src/constants/imagens.ts` descreve o que a imagem mostra — "salão de café
   com luz natural" — e nunca "nosso salão". A diferença não é preciosismo:
   é o que separa ilustrar de alegar.

2. **Nenhuma foto vai para onde ela viraria afirmação de fato.** Por isso
   `/contato` continua sem imagem. Uma fachada ao lado de "o endereço completo
   entra assim que a casa confirmar" contradiz, na mesma tela, a honestidade
   que aquela página inteira foi escrita para sustentar.

3. **Nenhuma foto vira fundo full-bleed.** Dentro da prancha elas têm de 250 a
   660 px de largura — é o teto real. Servem em cartão e ladrilho. Esticadas,
   entregariam borrão. É por isso que este site não tem hero fotográfico:
   limitação de origem, não escolha de estilo.

4. **A troca é de uma linha.** Todo o acervo passa por
   `src/constants/imagens.ts`. Quando o BLK-002 chegar, troca-se o import e o
   `alt`; nenhuma seção muda.

O recorte é reproduzível por `npm run marca:recortar`
(`scripts/recortar-marca.mjs`), com as coordenadas em fração da prancha.

> **O script é ferramenta local, não etapa de build.** `brand/*.png` são 74 MB
> e estão no `.gitignore` — quem clonar o repositório não consegue rodá-lo sem
> baixar as pranchas do Drive do projeto antes. O que o site usa são os WebP em
> `src/assets/marca/`, que **são** versionados. Por isso o build da Vercel
> nunca depende de `brand/`.

## Consequências

**Boas**

- O site passa a mostrar café, brasa, fumaça, música e mesa cheia por
  **~300 KB** de WebP no repositório, com `srcset` até a resolução nativa.
- Os cinco elementos do fogo ganham a cena que cada um descreve — madeira,
  brasa, técnica, fumaça, descanso — em correspondência 1 para 1 com
  `ELEMENTOS_DO_FOGO`.
- O JavaScript continua em 6.984 bytes: `<Image>` do Astro resolve tudo no
  build.

**Ruins — e é preciso dizer em voz alta**

- **Um visitante pode entender que está vendo a casa.** Nós não afirmamos isso
  em lugar nenhum, mas foto ao lado de nome de restaurante carrega essa
  sugestão sozinha. É o custo da decisão, e ele é real.
- Em tela 2x algumas ficam levemente macias, porque a fonte acaba antes.
- Enquanto durar, existe uma dívida visual que só o cliente pode pagar.

## Quando reverter

**Assim que o BLK-002 chegar.** Não é "quando der": é a primeira coisa a fazer
com o acervo real na mão. Esta decisão é um empréstimo tomado contra uma
entrega que já foi pedida.

Antes de ir para o ar em domínio próprio, **o cliente precisa ver estas imagens
e concordar com elas.** Ele conhece a própria casa e sabe se a distância entre
a foto e o salão é aceitável — essa avaliação é dele, não nossa.
