# 00 — Visão de Produto

## O problema

A casa tem marca de sobra e presença digital de menos.

O guia SOCIAL DNA (ago/2025) entrega um sistema de marca maduro: manifesto,
pilares, paleta por turno, tom de voz por marca, frases proprietárias, política
de feed. As duas contas somam **~42 mil seguidores** (@casa.coffee 31,2K +
@haubert.steakhouse 10,8K). O conteúdo funciona.

E aí a jornada quebra:

1. Quem descobre a casa **não encontra cardápio** — ele não existe fora do balcão
2. Quem quer reservar **manda DM** e espera alguém ver
3. Quem procura "steakhouse Novo Hamburgo" no Google **não acha a casa**
4. Quem quer saber o line-up do sábado depende de **story que expira em 24h**

Ou seja: a marca gera demanda e a demanda vaza. O Instagram é ótimo para gerar
desejo e péssimo como infraestrutura de conversão — não indexa, não tem cardápio
navegável, não guarda agenda e não tem CTA persistente.

## A north star

> **Transformar seguidor em mesa ocupada.**

Métrica-guia da Fase 1: **cliques no CTA de reserva por sessão**, cruzados com a
contagem manual de reservas da casa nos primeiros 30 dias, para achar a taxa real.

Métricas de apoio:
- Posição orgânica para "steakhouse Novo Hamburgo" e "café Novo Hamburgo"
- LCP < 2,0s no mobile em 4G
- % de sessões que alternam Dia/Noite (proxy do *aha moment*)

## A solução

Um site que faz na tela o que a casa faz no salão às 19h: **muda de pele**.

- **Modo Dia — CASA Coffee Colab.** Claro, leve, urbano. Café, comida boa, trabalho, cultura.
- **Modo Noite — HAUBERT Steak & Grillhouse.** Escuro, quente, intenso. Fogo, corte, drink, música.
- **Uma casa.** Mesmo endereço, mesma equipe, mesma reserva.

Sobre isso: cardápio navegável, agenda cultural confiável, e um botão de reserva
que nunca sai da tela — **três toques, no máximo**.

E, atrás, um painel onde a própria equipe atualiza cardápio, agenda e fotos sem
depender de desenvolvedor.

## O que este produto NÃO é

Escopo fechado importa tanto quanto escopo aberto:

- **Não é delivery.** iFood e afins continuam onde estão
- **Não é e-commerce.** Sem carrinho, sem gift card, sem clube de assinatura (Fase 1-3)
- **Não é sistema de PDV nem de gestão de salão**
- **Não é blog.** Conteúdo editorial continua no Instagram
- **Não é app.** É web, mobile-first
- **Não é um site "sobre nós" bonito e parado.** Se não converte reserva, falhou

## Por que agora

- A marca acabou de ser fechada (guia de ago/2025) — o custo de aplicar é mínimo agora e cresce depois
- A audiência já existe: 42K seguidores sem destino claro
- Concorrência local usa template genérico ou só Instagram — a barra está baixa
- A stack escolhida (ADR-001) mantém tudo em tier gratuito

## Diferencial competitivo

| Alternativa | O que entrega | O que não entrega |
|---|---|---|
| Só Instagram (hoje) | Desejo, alcance, prova social | Indexação, cardápio, agenda, CTA persistente |
| Site de template (concorrência local) | Endereço e telefone | Marca, atmosfera, conversão |
| Linktree | Roteamento de links | Qualquer coisa de marca |
| **CASA + HAUBERT** | A atmosfera da casa na tela + reserva em 3 toques | (Delivery e e-commerce, por escolha) |

O diferencial não é "ter site". É o site **parecer a casa** — e ser o único da
região que traduz o conceito de marca em mecânica de produto.

## Estratégia de funil

| Etapa | Onde acontece | O que o site faz |
|---|---|---|
| **Atenção** | Instagram, Google local, boca a boca | Recebe do link na bio e da busca; o modo Dia/Noite prende nos primeiros 2s |
| **Confiança** | O próprio site | Foto real, gente real, manifesto, cortes, agenda viva — a prova é a atmosfera |
| **Oferta** | CTA persistente | Reserva em 3 toques, no canal que a equipe já usa (WhatsApp — ADR-005) |
| **Retorno** | Agenda + eventos | Line-up compartilhável traz o mesmo público de volta toda semana |

> **Escassez, quando existir, é real.** Mesa limitada em data específica e vaga
> de evento com lotação são fatos. Contagem regressiva inventada e
> "restam 2 lugares" fabricado estão proibidos (`memory/restrictions.md`).

## Roadmap

| Fase | Entrega | Critério de saída |
|---|---|---|
| **0 — Fundação** ← *aqui* | Governança, docs, design system, ADRs, plano de segurança | Checklist de validação da skill fechado |
| **1 — Site institucional** | Home Dia/Noite, sobre, cultura, contato, reserva via WhatsApp, SEO local + schema.org | Site no ar em domínio próprio, LCP < 2s, CTA rastreado |
| **2 — Conteúdo vivo** | Cardápio e agenda vindos do Supabase, página de evento com OG image | Cliente vê cardápio atualizado sem deploy |
| **3 — Painel da equipe** | Auth, CRUD de cardápio/agenda/fotos, reserva nativa com confirmação | Equipe publica sozinha por 30 dias sem suporte |
| **4 — Produto** | Empacotar como template multi-tenant para outras casas | Segunda casa rodando no mesmo código |

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Fotos ruins** (BLK-002) | Alta | Crítico — o site é visual | Orçar ensaio ou negociar acervo original antes da Fase 1 |
| Cliente não confirma insumos (endereço, WhatsApp, cardápio) | Média | Bloqueia lançamento | Lista única de pendências em `memory/bugs.md`, cobrada semanalmente |
| Equipe não adota o painel (Fase 3) | Média | Conteúdo envelhece e o site perde valor | Fase 3 só começa com o processo de confirmação acordado com a casa |
| Reserva por WhatsApp sem métrica limpa | Alta | Não sabemos o ROI | Contagem manual cruzada nos primeiros 30 dias (ADR-005) |
| Sobrecarga de escopo ("já que estamos aqui, coloca delivery") | Alta | Atrasa tudo | A seção "O que este produto NÃO é" é contratual |
