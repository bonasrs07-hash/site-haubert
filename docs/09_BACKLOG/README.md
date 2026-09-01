# 09, Backlog

## Bloqueadores antes de começar a Fase 1

Nada abaixo é opcional. Ver `memory/bugs.md` para o detalhe de cada um.

| ID | Pendência | Quem resolve |
|---|---|---|
| BLK-003 | Endereço, telefone e horário oficiais dos dois turnos | Cliente |
| BLK-005 | Número de WhatsApp Business oficial | Cliente |
| BLK-002 | Acervo de fotos em alta (ou orçamento de ensaio) | Cliente |
| BLK-001 | Logos vetoriais (SVG) das duas marcas | Designer do guia |
| BLK-006 | Domínio | Cliente |

> Sem BLK-002 o site não entrega. Este é um produto visual: com thumb de 300px
> ele fica pior do que o Instagram, que é justamente o problema que viemos resolver.

---

## Fase 1, Site institucional (MVP)

**Definição de pronto da fase:** site no ar em domínio próprio, LCP < 2s no
mobile em 4G, CTA de reserva rastreado, indexado no Google para o nome da casa.

### Épico A, Fundação técnica
- [x] Projeto Astro 7 (`static` + adapter) + Tailwind v4 + estrutura de `src/` do blueprint
- [x] `tokens.css` integrado; Tailwind v4 apontando para os tokens via `@theme inline`
- [x] `@fontsource` das 4 famílias, self-hosted, subset latino
- [x] Script inline de tema no `<head>` (anti-FOUC), ADR-004
- [x] Layout base: cabeçalho, alternador Dia/Noite, rodapé, barra de reserva fixa
- [ ] Deploy na Vercel + preview por branch, **não depende de BLK-006**: o
      domínio trava o *lançamento*, não o *deploy*. Homologação sai em
      `*.vercel.app`, com `PUBLIC_SITE_URL` apontando para lá (senão a canônica
      e o `og:image` apontam para um domínio que ainda não existe)
- [ ] Lighthouse CI com os tetos de `docs/01_ARQUITETURA`
- [ ] ESLint + Prettier, o `CLAUDE.md` lista os dois na stack e **nenhum dos
      dois está instalado**. Hoje quem segura tipo e sintaxe é `astro check`
      (0 erro em 40 arquivos). Ou instala, ou corrige a stack no `CLAUDE.md`;
      promessa de doc que o código não cumpre é o começo de doc zumbi

### Épico B, Conteúdo institucional
- [x] **Home**, hero manifesto, "duas culturas, uma casa", o que entregamos, fogo, cultura, CTA
- [x] **Sobre**, o manifesto social, os 6 pilares, o compromisso
- [x] **Fogo**, os 5 elementos do fogo e os 6 cortes (sem preço)
- [x] **Cultura**, música, arte, cidade; eventos por cadência (sem data até a Fase 2)
- [ ] **Pessoas**, o time que faz a casa, **bloqueado por BLK-008 (autorização de imagem)**
- [x] **Contato**, horário dos dois turnos, Instagram das duas marcas; endereço e mapa **pendentes de BLK-003**
- [x] `/noite`, rota própria com modo Noite forçado, indexável (estática, não SSR, não há dado dinâmico a buscar)

### Épico C, Conversão
- [x] `BotaoReserva` com folha de reserva (3 toques), F-001. Saiu **sem React**: `<details>` + radios, ver ADR-006
- [x] Deep link `wa.me` com mensagem no tom da marca + UTM (ativa quando BLK-005 fechar)
- [ ] Evento `reserva_click` no analytics, Vercel Analytics ligado; falta o evento nomeado
- [x] Degradação para telefone e, sem telefone, para o Instagram da marca ativa

### Épico D, Encontrabilidade
- [x] Meta tags e OG por página, **com imagem OG**, `public/og.jpg` (1200×630,
      tipográfica, dia/noite). Não depende de BLK-002: foto do deck não tem
      resolução para 1200px, então o card é tipográfico de propósito
- [x] `schema.org/Restaurant` para as duas marcas, `openingHoursSpecification` e `address` completos **dependem de BLK-003**
- [x] `sitemap.xml` e `robots.txt`
- [ ] Favicon e ícone de app, **não existe nenhum hoje**: sem arquivo e sem
      `<link rel="icon">`, a aba fica com o ícone genérico e `/favicon.ico`
      responde 404. O logo vetorial é BLK-001, mas isso não trava: dá para
      sair um ícone tipográfico por token, como já foi feito no `og.jpg`
- [ ] Google Business Profile das duas marcas apontando para o site
- [x] Página `/privacidade` (LGPD) + `/404` com saídas

---

## Fase 2, Conteúdo vivo
- [ ] Schema + migrations + seeds no Supabase
- [ ] `/cardapio` SSR consumindo `menu_items`, F-003
- [ ] `/agenda` e `/evento/[slug]` com OG image por evento, F-004
- [ ] Newsletter com opt-in explícito e separado
- [ ] Teste de isolamento entre tenants no CI

---

## Fase 3, Painel da equipe
- [x] Auth Supabase + `venue_members`, e-mail e senha, **um login só**, cadastro
      público desligado no console. Sessão em cookie `httpOnly`, validada contra
      o servidor de Auth a cada requisição ([ADR-008](../08_DECISOES/adr-008-painel-de-fotos.md))
- [x] **Upload para Storage com policy por `venue_id`**, bucket privado,
      caminho começando pelo slug da casa, RLS em `media` e `media_slots`
- [x] `/painel` com troca de **fotos** + galeria de reuso, a parte de fotos do
      F-005. Publicação por Deploy Hook: o site segue estático e otimizado
- [ ] `/painel` com CRUD de **cardápio e agenda**, o resto do F-005
- [ ] Reserva nativa: endpoint validado, rate limit, e-mail transacional
- [ ] Job de anonimização (retenção de 12 meses)

> **Antes de o painel ir para produção**, ver "Pendências do painel" abaixo:
> três itens que ficaram conscientemente de fora e um que é passo de console.

> **Pré-requisito de processo, não de código:** a Fase 3 só começa depois que a
> casa definir quem confirma reserva e em quanto tempo. Reserva nativa sem
> processo de confirmação é pior que WhatsApp (ADR-005).

---

## Fase 4, Empacotar como produto

O trabalho já está sendo feito de um jeito que permite isso: multi-tenant desde
a linha 1 (ADR-002), marca como dado, tokens em JSONB. A Fase 4 é comercial mais
do que técnica.

**A oferta, em uma frase mensurável:**
> *Site de casa gastronômica no ar em 21 dias, com reserva em 3 toques e a
> equipe publicando sozinha, a partir do seu guia de marca.*

**O que precisa existir para vender:**
- [ ] Segunda casa rodando no mesmo código (a prova de que é produto, não projeto)
- [ ] Case documentado do CASA + HAUBERT: antes/depois, cliques em reserva,
      posição no Google, tempo de carregamento, **números, não adjetivos**
- [ ] Onboarding empacotado: o que o cliente entrega, em quanto tempo, o que recebe
- [ ] Escopo negativo explícito: não é delivery, não é e-commerce, não é PDV
- [ ] Preço por valor entregue (mesa ocupada), não por hora de desenvolvimento

**O que NÃO fazer:** construir o painel de auto-atendimento genérico antes de
ter a segunda casa. Duas casas atendidas manualmente provam a dor; SaaS antes
disso é pular etapa.

---

## Pendências do painel de fotos ([ADR-008](../08_DECISOES/adr-008-painel-de-fotos.md))

| Pendência | Por que ficou de fora | Risco enquanto durar |
|---|---|---|
| **CSP não configurada** | Já era lacuna antes do painel (Camada 4 de `docs/11_SEGURANCA` diz "configurar na Vercel" e nunca foi). Fazer agora exige resolver o `nonce`/hash do script inline de tema do [ADR-004](../08_DECISOES/adr-004-modo-dia-noite.md), feito às pressas, quebra a troca Dia/Noite no site inteiro | Médio, e **pré-existente**. O painel não piorou; só tornou a lacuna mais visível |
| **Freio de login é por instância** | Trava em memória não é compartilhada entre as instâncias serverless da Vercel. O freio de verdade seria no banco, como já é o de publicação | Baixo com senha longa; a defesa real é o limite do próprio Supabase Auth. Está escrito em `src/lib/freio.ts` para ninguém confundir com proteção completa |
| **Sem teste de ponta a ponta do fluxo logado** | Depende de um projeto Supabase de verdade, que ainda não existe. O que dá para testar sem ele foi testado: guarda de rota, 401 dos endpoints, validação de arquivo, orçamento de JS | Médio, o caminho feliz (entrar → enviar → publicar) nunca rodou contra um banco |
| **Cadastro público** | É passo de console, não de código | **Alto até ser feito.** Ver Passo 4b do `INSTALACAO.md` |

## Ideias registradas (não priorizadas)

| Ideia | Por que é interessante | Por que ainda não |
|---|---|---|
| Página por corte (`/corte/picanha`) | SEO de cauda longa forte | Precisa de foto boa por corte (BLK-002) |
| "Aberto agora" ao vivo no cabeçalho | Resolve a dor nº1 da persona Ana | Depende de BLK-003 |
| Gift card | Receita direta | Exige pagamento, fiscal e ADR novo |
| Playlist da casa embutida | Reforça o pilar de cultura | Embed de terceiro conflita com a CSP |
| Galeria puxando o feed do Instagram | Conteúdo sempre fresco de graça | API do Instagram é instável e vira dependência frágil |
| Reserva com controle de lotação | Evita overbooking | Só faz sentido depois da reserva nativa rodando |
