# Respostas do Intake — CASA + HAUBERT — site oficial da casa

> Fonte de verdade das respostas da entrevista de fundação. O `scaffold.sh` lê
> este arquivo para substituir os placeholders. Preencha durante a Fase 1.
> Data do intake: 2026-08-24 · Conduzido por: Matheus Bonato

## Bloco 1 — Produto e identidade
- **PRODUTO (nome + essência):** CASA + HAUBERT — site oficial da casa
- **ESSENCIA (1 frase):** Duas culturas, uma casa — CASA Coffee Colab de dia, HAUBERT Steak & Grillhouse depois das 19h, no mesmo endereço em Novo Hamburgo/RS
- **PROBLEMA que resolve:** A casa vive hoje só no Instagram: quem descobre a marca não encontra cardápio, agenda nem canal de reserva fora do DM, e o Google não indexa nada — a demanda gerada pelo conteúdo vaza no meio do caminho
- **PROPOSTA de valor / diferencial:** Transformar o DNA de marca já existente em uma casa digital que converte: um site que troca de pele entre Dia (CASA) e Noite (HAUBERT), com cardápio, agenda cultural e reserva em até três toques, e um painel onde a própria equipe atualiza tudo
- **Existe código ou é do zero?** Do zero — existe apenas o guia de marca SOCIAL DNA (ago/2025) em brand/

## Bloco 2 — Público e escopo
- **PUBLICO_ALVO primário:** Público local de Novo Hamburgo e Vale dos Sinos, 25-45 anos, que busca café e trabalho de dia e jantar, drinks e cultura à noite; mais turista regional e organizador de encontros
- **PERSONAS (1-3):** Ana (32, trabalha remoto, procura café bom com wi-fi e ambiente de dia) · Rafael (38, marca jantar de sexta e quer ver cortes e ambiente antes de reservar) · Júlia (27, segue o Instagram pelos eventos e DJs e quer saber o line-up da semana)
- **B2B / B2C / B2B2C:** B2C (a casa vende direto ao consumidor final); a plataforma nasce B2B2C, para depois hospedar outras casas
- **"Aha moment":** Ao alternar Dia/Noite o visitante entende em 2 segundos que são duas casas no mesmo endereço — e sai com reserva feita sem sair do site

## Bloco 3 — Multi-tenant e white-label
- **MULTI_TENANT:** Multi-tenant desde já — tenant = casa (venue). CASA e HAUBERT nascem como duas marcas do mesmo tenant, e a modelagem já prevê outras casas  <!-- multi-desde-já / single-agora-multi-roadmap / single-definitivo -->
- **WHITE_LABEL:** Sim — paleta, tipografia, copy e logo vêm da tabela brands; nada de cor ou nome de marca hardcodado no componente     <!-- sim / não -->
- **PLANOS (free/pro/enterprise):** Não há planos na fase 1. Feature flags por tenant já previstas na modelagem

## Bloco 4 — Stack e arquitetura
- **STACK:** Astro 7 (output static + adapter; `hybrid` foi removido no Astro 5+) + Tailwind CSS v4 + ilhas React pontuais + Supabase (Postgres, Auth, Storage, RLS) + Vercel
- **MODELO_ARQUITETURA:** A-híbrido — site estático/SSR pelo Astro consumindo Supabase direto pela camada de serviços; sem API própria na fase 1  <!-- A: SPA+BaaS / B: API própria / C: serviço sem UI -->
- **TEM_UI:** Sim
- **DEPLOY:** Vercel (Hobby) — build automático a partir do repositório; dados no Supabase (região São Paulo)
- **SCHEMA_PATH:** supabase/schema.sql
- **ENV_PREFIX:** import.meta.env.PUBLIC_*  <!-- ex: import.meta.env.VITE_* -->
- **TEST_CMD:** npm run test       <!-- ex: npm test -->

## Bloco 5 — Segurança e compliance
- **Trata dado pessoal/financeiro/de menores?** Sim — dados pessoais de reserva (nome, telefone, e-mail, data e tamanho do grupo) e credenciais da equipe no painel. Sem dado financeiro e sem pagamento na fase 1
- **COMPLIANCE específico:** LGPD — base legal de execução de contrato para a reserva, consentimento explícito para newsletter, retenção limitada e canal de exclusão  <!-- LGPD / GDPR / PCI / fiscal / nenhum -->
- **Nível de isolamento entre clientes:** Isolamento por tenant_id com RLS obrigatória em toda tabela; nenhuma consulta do painel pode atravessar tenant

## Bloco 6 — Custo
- **FASE_CUSTO:** Bootstrap — tudo em tier gratuito (Vercel Hobby, Supabase Free). Nenhum serviço pago aprovado  <!-- bootstrap gratuito / com orçamento -->
- **Serviços pagos já aprovados:** Nenhum. Domínio e a fonte Druk (paga) ficam adiados e registrados como decisão pendente

## Bloco 7 — Design (se tem UI)
- **Identidade visual definida?** Sim — guia SOCIAL DNA completo (16 pranchas) com paletas, tipografia, tom de voz e frases proprietárias, extraído em brand/BRAND-DNA-EXTRAIDO.md
- **Referências / tom visual:** Editorial escuro e cinematográfico, referência disturbancebrands.com — tipografia display gigante com tracking negativo, corpo monoespaçado em caixa alta, muito respiro, fotografia com luz real
- **Contexto de uso crítico:** Mobile-first e sob QR code na mesa, com pouca luz à noite — alvo de toque generoso e contraste alto são requisito, não enfeite  <!-- toque/PDV, mobile, desktop -->
- **PRINCIPIO_N1:** INTUITIVIDADE — reservar não pode custar mais de três toques a partir de qualquer tela  <!-- default UI: INTUITIVIDADE -->

## Roadmap inicial
- **FASE_ATUAL:** Fase 0 — Fundação (governança, documentação e design system antes da primeira linha de UI)
- **Próximas fases:** Fase 1 site institucional Dia/Noite com reserva por WhatsApp · Fase 2 cardápio e agenda vindos do Supabase · Fase 3 painel da equipe e reserva nativa · Fase 4 empacotar como produto para outras casas
