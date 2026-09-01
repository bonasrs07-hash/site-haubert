# Design System, CASA + HAUBERT

> **A marca não se inventa aqui.** Tudo abaixo é derivado do guia SOCIAL DNA
> (ago/2025) em `brand/`, com os hex amostrados pixel a pixel das pranchas
> originais. Extração completa: `brand/BRAND-DNA-EXTRAIDO.md`.
> Tokens executáveis: [`src/styles/tokens.css`](../../src/styles/tokens.css), a
> implementação é a fonte única. Este documento explica as decisões; o arquivo
> é o que roda.

## Objetivo
- Dar um vocabulário visual único para as duas marcas da casa
- Garantir que a troca Dia/Noite seja mecânica de token, não condicional de código
- Tornar o white-label (ADR-002) real: nenhuma cor literal em componente

## Contexto
- Duas marcas, um sistema: **CASA** (dia, clara) e **HAUBERT** (noite, escura)
- Uso real: **celular, na mesa, com pouca luz** → contraste e alvo de toque são requisito
- Referência estrutural de layout: `disturbancebrands.com`, editorial escuro,
  display gigante com tracking negativo, corpo monoespaçado, muito respiro

## Regras Gerais
1. **Cor literal em componente é bug.** Use sempre `var(--cor-*)`.
2. **Nenhum componente sabe se é dia ou noite.** Ele pinta com token; o token resolve.
3. **Contraste mínimo AA (4.5:1) para texto de corpo nos dois modos.** Testado, não presumido.
4. **Zero JS para trocar cor**, a troca é atributo no `<html>` (ADR-004).
5. Espaçamento sai da escala. Valor mágico (`margin-top: 37px`) não passa em review.

## Validações
- [ ] `grep -rn "#[0-9a-fA-F]\{6\}" src/components/` retorna vazio
- [ ] Todo par texto/fundo dos dois modos passa AA
- [ ] Nenhum alvo de toque menor que 44×44px
- [ ] Página renderiza legível com JS desligado, no modo padrão

## Permissões
- Dono da marca (cliente): aprova mudança de paleta, fonte e copy
- Tech lead: aprova mudança de token e de escala

## Exceções
- Foto e vídeo escapam do sistema de cor (são conteúdo, não interface)
- Overlay sobre foto pode usar preto/branco com alfa, desde que via token

## Auditoria
- Rodar checagem de contraste no CI a cada PR que toque em `src/styles/tokens.css`
- Revisar contra `brand/` sempre que o cliente publicar novo guia

## Eventos
- `design.token_changed`, `design.mode_toggled`, `design.brand_added`

## Casos de Uso
- "Que vermelho eu uso num botão à noite?"
- "Como adiciono uma terceira marca?"
- "Por que o título não está em Druk?"

## Critérios de Aceite
- [x] Paletas dos dois modos definidas com hex do original
- [x] Contraste calculado e documentado
- [x] Escala tipográfica definida
- [x] `src/styles/tokens.css` executável

---

## 1. Cor

### 1.1 Paletas de marca (hex amostrado do guia)

**CASA, modo Dia.** *Claro, natural, urbano, daylight. Acolhedor e leve.*

| Token | Hex | Nome | Uso |
|---|---|---|---|
| `--casa-areia` | `#DACFBB` | Areia / linho | Superfície elevada, cards |
| `--casa-sage` | `#A0A083` | Sage | Bordas, ícones, detalhe |
| `--casa-oliva` | `#555123` | Oliva escuro | Texto secundário, tags |
| `--casa-tinta` | `#232322` | Tinta | Texto principal |
| `--casa-terracota` | `#BE6A44` | Terracota | Preenchimento decorativo |

**HAUBERT, modo Noite.** *Escuro, quente, intenso, noturno. Robusto e autoral.*

| Token | Hex | Nome | Uso |
|---|---|---|---|
| `--haubert-carvao` | `#131212` | Carvão | Superfície base |
| `--haubert-grafite` | `#212120` | Grafite | Superfície elevada |
| `--haubert-brasa` | `#631F15` | Brasa | Preenchimento de botão |
| `--haubert-caramelo` | `#784920` | Caramelo queimado | Bordas, detalhe |
| `--haubert-areia` | `#D0BDA1` | Areia quente | Texto principal |

**Sistema**, comuns aos dois modos

| Token | Hex | Uso |
|---|---|---|
| `--osso` | `#F6EFE7` | Fundo claro / texto sobre escuro |
| `--tijolo` | `#A0361F` | Acento da marca (o vermelho do guia) |
| `--tijolo-claro` | `#D9553A` | Acento legível sobre fundo escuro |

### 1.2 Tokens semânticos (o que os componentes usam)

| Token | Modo Dia | Modo Noite | Papel |
|---|---|---|---|
| `--cor-superficie` | `#F6EFE7` | `#131212` | Fundo da página |
| `--cor-superficie-2` | `#DACFBB` | `#212120` | Card, seção alternada |
| `--cor-texto` | `#232322` | `#D0BDA1` | Texto de corpo |
| `--cor-texto-forte` | `#131212` | `#F6EFE7` | Títulos, display |
| `--cor-texto-suave` | `#555123` | `#A3937D` | Legenda, meta, label |
| `--cor-acento` | `#A0361F` | `#D9553A` | Link, destaque de texto |
| `--cor-acento-fundo` | `#A0361F` | `#631F15` | Preenchimento de botão |
| `--cor-acento-texto` | `#F6EFE7` | `#F6EFE7` | Texto sobre o acento |
| `--cor-borda` | `#A0A083` | `#784920` | Régua, borda, divisória |

### 1.3 Contraste verificado (WCAG 2.1)

| Par | Modo | Razão | Veredito |
|---|---|---|---|
| `#232322` sobre `#F6EFE7` | Dia | **13,8:1** | AAA |
| `#555123` sobre `#F6EFE7` | Dia | **7,1:1** | AAA |
| `#A0361F` sobre `#F6EFE7` | Dia | **6,1:1** | AA (corpo) |
| `#F6EFE7` sobre `#A0361F` | Dia (botão) | **6,1:1** | AA (corpo) |
| `#D0BDA1` sobre `#131212` | Noite | **10,2:1** | AAA |
| `#F6EFE7` sobre `#131212` | Noite | **16,4:1** | AAA |
| `#A3937D` sobre `#131212` | Noite | **6,3:1** | AA (corpo) |
| `#D9553A` sobre `#131212` | Noite | **4,7:1** | AA (corpo) |
| `#F6EFE7` sobre `#631F15` | Noite (botão) | **10,6:1** | AAA |

> **Armadilha registrada:** `#A0361F` sobre `#131212` dá apenas **2,7:1** e
> reprova até para texto grande. Por isso o modo Noite usa `--tijolo-claro`
> (`#D9553A`) para texto e reserva `#631F15` (brasa) para preenchimento. Nunca
> use o tijolo puro como texto sobre carvão.

> Todos os valores acima foram medidos no site em execução (luminância
> relativa, WCAG 2.1), não estimados. `#D9553A` passa em AA com folga de
> 0,23, margem estreita: qualquer escurecimento futuro do acento da Noite
> precisa ser remedido antes de entrar.

### 1.4 Regras de aplicação
- **Terracota (`#BE6A44`) não é cor de texto.** 3,5:1 sobre osso, só decoração e fill grande.
- Foto escura recebe overlay `rgba(19,18,18,.55)` antes de qualquer texto por cima.
- Estado de foco: contorno de 2px em `--cor-acento` com 2px de deslocamento. Nunca `outline: none` sem substituto.

---

## 2. Tipografia

### 2.1 Famílias

O guia especifica **Druk / Bebas Neue** nos títulos e **Space Grotesk / Neue Haas
Grotesk** no texto. Druk e Neue Haas são pagas, ver **ADR-003**.

| Token | Fonte (Fase 1) | Licença | Papel |
|---|---|---|---|
| `--fonte-display` | **Anton** | OFL | Manifesto, números gigantes. *Substituta de Druk* |
| `--fonte-titulo` | **Bebas Neue** | OFL | Título de seção (como no guia) |
| `--fonte-corpo` | **Space Grotesk** | OFL | Corpo (como no guia) |
| `--fonte-mono` | **Space Mono** | OFL | Micro-label em caixa alta, é o gesto das legendas do guia |

Servidas via `@fontsource` (self-hosted). Sem chamada ao Google Fonts, ver
`docs/11_SEGURANCA/`.

### 2.2 Escala

| Papel | Fonte | Tamanho | Line-height | Tracking | Caixa |
|---|---|---|---|---|---|
| `display` | Anton | `clamp(3.5rem, 12vw, 9rem)` | `0.88` | `-0.03em` | ALTA |
| `h1` | Anton | `clamp(2.5rem, 7vw, 5rem)` | `0.92` | `-0.02em` | ALTA |
| `h2` | Bebas Neue | `clamp(2rem, 4.5vw, 3.25rem)` | `0.95` | `-0.01em` | ALTA |
| `h3` | Bebas Neue | `1.5rem` | `1.3` | `0.01em` | ALTA |
| `eyebrow` | Space Mono | `0.75rem` | `1.4` | `0.18em` | ALTA |
| `body` | Space Grotesk | `1.125rem` | `1.55` | `0` | normal |
| `body-sm` | Space Grotesk | `0.9375rem` | `1.5` | `0` | normal |
| `meta` | Space Mono | `0.8125rem` | `1.45` | `0.06em` | ALTA |

> O par **display gigante com tracking negativo + label monoespaçada com tracking
> largo** é a assinatura do sistema. É o que o guia faz nas pranchas e o que a
> referência faz na web. Não misture: título nunca tem tracking positivo, label
> nunca tem tracking negativo.

### 2.3 Regras
- Máximo **65 caracteres** por linha em corpo (`max-width: 65ch`)
- Display sempre em caixa alta; corpo nunca
- Nunca dois pesos de display na mesma tela
- Número de estatística usa `--fonte-display` e `font-variant-numeric: tabular-nums`

---

## 3. Espaçamento e grid

Base **8px**. Escala: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192`.

| Token | Valor | Uso |
|---|---|---|
| `--esp-1` … `--esp-11` | 4px … 192px | Escala geral |
| `--ritmo-secao` | `clamp(4rem, 10vw, 10rem)` | Respiro vertical entre seções |
| `--largura-max` | `1440px` | Contêiner |
| `--gutter` | `clamp(1.25rem, 5vw, 4rem)` | Margem lateral |

Grid de 12 colunas no desktop, 4 no mobile. Seções editoriais quebram o grid de
propósito (imagem sangrando até a borda), mas sempre a partir de uma coluna.

---

## 4. Componentes-chave (especificação)

| Componente | Regra inegociável |
|---|---|
| **Botão de reserva** | Persistente. Fixo no rodapé no mobile. Alvo mínimo 48px de altura. Texto no tom da marca, nunca "Clique aqui" |
| **Alternador Dia/Noite** | Rótulo textual + estado visível. Nunca só ícone. Anuncia o estado via `aria-pressed` |
| **Card de corte / de café** | Foto 4:5, `eyebrow` em mono, nome em Bebas, uma linha de descrição. Sem preço na Fase 1 (BLK-004) |
| **Faixa de manifesto** | Fundo `--cor-acento-fundo`, texto display em `--cor-acento-texto`, frase vinda de `brand/` |
| **Card de evento** | Data em mono, nome em Bebas, foto 1:1, link para a página do evento |
| **Rodapé** | Endereço, horário dos dois turnos, Instagram das duas marcas, aviso de consumo responsável |

Detalhamento em `docs/06_COMPONENTES/`.

---

## 5. Movimento

- Transição padrão: `180ms cubic-bezier(.2,.6,.2,1)`
- Troca Dia/Noite: transição de `background-color` e `color` em **320ms**,
  o suficiente para o olho perceber a casa mudando, sem parecer lento
- Entrada de seção: `opacity` + `translateY(16px)`, uma vez só, via `IntersectionObserver`
- **`prefers-reduced-motion: reduce` desliga tudo.** Sem exceção
- Nada de parallax e nada de scroll sequestrado

---

## 6. Imagem

Toda foto passa por `Foto.astro`, que embrulha o `<Image>` do `astro:assets`.
Nenhuma seção escreve `<img>` na mão.

- **Formato: WebP**, gerado no build. O doc pedia AVIF; a origem hoje já é WebP
  lossy (recorte de prancha), e reencodar lossy → AVIF adicionaria perda de
  geração para economizar poucos KB num arquivo que já pesa ~10 KB. Quando
  entrar acervo original em alta, AVIF volta à mesa.
- **Proporções:** `16:11` (cartão de marca), `4:3` (ladrilho de elemento),
  `3:4` (tira de atmosfera), `21:5` (faixa larga). **Não há hero fotográfico**,
  ver o limite de resolução no [ADR-007](../08_DECISOES/adr-007-fotos-do-deck.md).
- **Teto:** 200kb acima da dobra, 120kb abaixo. Hoje a home inteira serve
  ~13 imagens somando bem menos que isso, todas `loading="lazy"` fora da
  primeira tela.
- **`srcset` sobe até a largura nativa do arquivo** e nunca além: pedir
  upscale de um recorte de prancha só gera peso e borrão.
- **Véu:** `--overlay-foto` é token e muda com o modo, a mesma foto assenta
  mais clara de dia e mais funda à noite, sem segundo arquivo.
- **Tratamento:** luz real, cor quente, sem filtro saturado.
- **Banco de imagem genérico continua proibido** (`memory/restrictions.md`). As
  fotos atuais não são banco: saem das pranchas da própria marca, e entram sob
  as quatro regras do ADR-007, entre elas, a de que nenhum `alt` afirma que a
  cena é a casa real.
- **`alt` descreve a cena, não a marca:** *"brasa viva sob carvão"*, nunca
  *"HAUBERT"* e nunca *"nosso salão"*.

---

## 7. Como adicionar uma marca (Fase 4)

1. Inserir linha em `brands` com `tokens` (JSONB) no formato de `src/styles/tokens.css`
2. Nenhum código de componente muda
3. Validar contraste dos novos pares antes do merge
