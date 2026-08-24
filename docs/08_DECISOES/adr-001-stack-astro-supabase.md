# ADR-001: Stack — Astro híbrido + Tailwind + Supabase + Vercel

## Status
Accepted — 2026-08-24

## Contexto

O produto é o site oficial de uma casa de hospitalidade (CASA Coffee Colab de
dia, HAUBERT Steak & Grillhouse à noite) em Novo Hamburgo/RS. As características
que mandam na escolha da stack:

1. **É conteúdo antes de ser aplicação.** 90% das telas são institucionais:
   manifesto, cortes, cultura, agenda, contato. Só a reserva e a troca Dia/Noite
   têm estado real.
2. **SEO local é objetivo de negócio, não detalhe.** Hoje a casa não aparece no
   Google. Se o site não indexar bem para "steakhouse Novo Hamburgo", ele
   falhou — independentemente de quão bonito esteja.
3. **O uso real é celular em 4G, muitas vezes com pouca luz, na mesa.** Peso de
   JS e LCP são requisito de conversão.
4. **O cliente precisa editar cardápio e agenda sozinho** (resposta do intake),
   o que exige um backend com auth e painel — não dá para ser 100% estático.
5. **Fase bootstrap:** tudo tem que caber em tier gratuito.

O padrão default da casa (Kora) é React + Vite + Supabase. Ele é ótimo para
aplicação com sessão, mas uma SPA entrega HTML vazio ao crawler e paga custo de
hidratação que este produto não precisa pagar em 90% das telas.

## Decisão

Adotar **Astro 7 com `output: 'static'` + adapter Vercel**, com:

- **Astro** para todas as páginas de conteúdo → HTML estático, zero JS por padrão
- **SSR sob demanda** (`export const prerender = false`) nas rotas que dependem
  de dado fresco: agenda, cardápio e o painel da equipe
- **Ilhas React** (`client:idle` / `client:visible`) apenas onde há estado real:
  troca Dia/Noite, formulário de reserva, carrossel de cortes
- **Tailwind CSS** consumindo tokens da marca declarados como CSS custom
  properties (a troca Dia/Noite reescreve tokens, não classes)
- **Supabase** (Postgres + Auth + Storage + RLS), região São Paulo, como banco e
  CMS da equipe
- **Vercel Hobby** como deploy, com build automático a partir do repositório

Todo acesso ao Supabase passa por `src/lib/` — a camada de serviços. Componente
nunca fala com o banco direto.

## Alternativas Consideradas

**React + Vite + Supabase (o default da casa)**
- Prós: é o padrão que o time já domina; ecossistema conhecido; um só modelo mental
- Contras: SPA entrega HTML vazio ao crawler (perde o objetivo nº1); paga
  hidratação em página que é texto puro; precisaria de SSR bolt-on para
  recuperar o SEO, o que anula a simplicidade que era a vantagem

**Next.js App Router**
- Prós: SSR e rotas de API nativos; caminho pronto se aparecer e-commerce
- Contras: peso de runtime e complexidade (RSC, cache, revalidação) que este
  escopo não paga; ainda envia JS de framework para páginas que são só texto.
  Fica registrado como caminho de migração se a Fase 4 incluir venda online

**Site 100% estático (Astro puro / 11ty), conteúdo em Markdown**
- Prós: o mais rápido e barato possível
- Contras: mata o requisito de o cliente editar sozinho; toda mudança de
  cardápio viraria tarefa de desenvolvedor. Foi descartado pela resposta do
  intake ("Supabase como CMS + painel simples")

**Shopify / Wix / Webflow**
- Prós: o cliente edita tudo; zero manutenção de infra
- Contras: mensalidade recorrente (contra a restrição de custo), teto de
  customização visual que inviabiliza a troca Dia/Noite como projetada, e nenhum
  reaproveitamento para a Fase 4 (empacotar como produto)

## Consequências

**Positivas**
- HTML pronto no primeiro byte → SEO local e LCP resolvidos por arquitetura
- Orçamento de JS pequeno e explícito (< 60kb na home) — ver `memory/restrictions.md`
- O mesmo repositório serve site público e painel da equipe
- Custo zero: Vercel Hobby + Supabase Free

**Negativas / riscos**
- **Duas linguagens de componente no repo** (`.astro` e `.tsx`). Mitigação: a
  regra "ilha nova exige justificativa no PR" mantém o número de `.tsx` baixo
- **Astro é menos familiar ao time** que React puro. Mitigação: a superfície
  usada é pequena (layouts, slots, `astro:assets`, endpoints)
- **`static` + adapter exige disciplina**: esquecer `prerender = false` numa rota
  dinâmica gera página congelada no build. Mitigação: checklist de PR
- Chave `service_role` só pode existir em contexto de servidor — reforçado em
  `CLAUDE.md` e `docs/11_SEGURANCA/`

## Referências
- `docs/01_ARQUITETURA/README.md` — o desenho completo
- ADR-002 — como o multi-tenant se apoia nessa stack
- ADR-004 — por que a troca Dia/Noite é token, e não rota
