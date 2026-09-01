# ADR-008 — Painel de fotos: o dono troca, o build otimiza

- **Status:** aceito
- **Data:** 2026-08-29
- **Relacionado:** [ADR-001](adr-001-stack-astro-supabase.md) (stack),
  [ADR-002](adr-002-multi-tenant-white-label.md) (multi-tenant),
  [ADR-006](adr-006-fase1-sem-react.md) (zero React),
  [ADR-007](adr-007-fotos-do-deck.md) (fotos emprestadas), BLK-002, BLK-008

## Contexto

O dono precisa trocar as fotos do site sozinho. Hoje ele não consegue: as 15
fotos são `import` de `src/assets/marca/*.webp` resolvidos em tempo de build
pelo `astro:assets`, e o site é `output: 'static'`. Foto enviada em runtime não
aparece numa página que já foi pré-renderizada.

A pergunta que decide a arquitetura não é "como fica a tela do painel". É
**como o arquivo enviado chega até o HTML publicado.** Três caminhos foram
medidos contra as restrições vigentes:

| Caminho | Otimização | Página pública | Custo |
|---|---|---|---|
| Servir do Storage em SSR | **Nenhuma** — transformação de imagem do Supabase é Pro | vira SSR, consulta o banco a cada visita | US$ 25/mês |
| Otimizar no upload, servir em SSR | Boa | vira SSR; cache de CDN em URL fixa envelhece | R$ 0, mais peças |
| **Rebuild automático** | `astro:assets` como hoje | **continua estática** | **R$ 0** |

O fato que elimina o primeiro caminho é de preço, não de gosto: as
transformações de imagem do Supabase existem **a partir do plano Pro**. No
free tier a foto sai do Storage exatamente como foi enviada — sem redimensionar,
sem WebP, sem `srcset`. Isso viola a restrição "Imagem sempre otimizada"
(`memory/restrictions.md`) e o teto de LCP < 2s no 4G de `docs/01_ARQUITETURA`,
num site onde foto é 90% do peso.

## Decisão

**O painel escreve no banco; o build continua sendo quem otimiza.**

1. O dono envia a foto no painel → o arquivo vai para o Storage do Supabase
   (bucket **privado**) e ganha um registro em `media`.
2. O dono aponta a foto para uma **vaga** (`foto-dia`, `fogo-3`, `tira-5`…) →
   `media_slots`.
3. O dono clica em **Publicar** → um Deploy Hook da Vercel dispara um build.
4. No build, `src/lib/midia.ts` lê o manifesto com a `service_role`, gera URLs
   assinadas de curta duração e entrega ao `astro:assets`, que baixa, converte
   e gera o `srcset` — exatamente como faz hoje com os arquivos do repositório.

O site publicado **não aponta para o Supabase**: ele serve `/_astro/*.webp`
gerados no build. A URL assinada morre com o build que a criou.

### O fallback é a decisão anterior

Vaga sem foto no banco, Supabase fora do ar, ou `.env` não configurado: o build
usa o arquivo versionado em `src/assets/marca/`. **O site nunca deixa de
compilar por causa do banco** — é a mesma postura de `supabasePublico()`
devolvendo `null` (F-006).

Isso reposiciona o ADR-007: as fotos do deck deixam de ser *a* fonte e passam a
ser o **piso**. O empréstimo continua registrado, e agora tem porta de saída
sem tocar em código.

### Login único, e o que isso quer dizer na prática

"Um login só" não é uma constante no código com o e-mail do dono — isso seria
identidade hardcodada, contra o ADR-002. É o desenho já previsto no
`schema.sql`:

- autenticação por e-mail e senha no Supabase Auth;
- **cadastro público desligado** no console do Supabase (passo obrigatório,
  documentado no `INSTALACAO.md`) — sem isso, qualquer um cria conta;
- não existe rota de cadastro, de convite nem de "esqueci a senha" no site;
- a conta do dono é criada à mão e ganha uma linha em `venue_members` com
  `papel = 'dono'`;
- quem autoriza cada operação é a **RLS**, via `e_membro_da_casa(venue_id)` —
  o painel usa o token DO USUÁRIO, nunca a `service_role`.

A `service_role` aparece em exatamente dois lugares, ambos sem browser: a
leitura do manifesto no build e a assinatura das URLs.

### Ilha React — a exceção do ADR-006, e por que ela se paga

O ADR-006 fechou a Fase 1 com zero React. O painel é o caso que aquele ADR
previu: envio com progresso, arrastar-e-soltar, seleção na galeria e pré-visualização
otimista são estado real, não conteúdo. Fazer isso com `<details>` seria
teimosia.

**A ilha só embarca em `/painel`.** O Astro só envia o JS da ilha nas páginas
que a usam — as páginas públicas continuam com os mesmos ~7 KB de hoje. Isso é
verificado por medição no CI, não por confiança.

## Consequências

**Boas**

- Site continua estático, otimizado e sem depender do Supabase para servir.
- R$ 0: Deploy Hook é gratuito no Hobby (5 hooks por projeto, 60 disparos/hora,
  100 deploys/dia — ordens de grandeza acima de um dono trocando foto).
- O BLK-002 deixa de ser bloqueio de código e vira tarefa de conteúdo.
- A galeria dá reuso: foto enviada uma vez serve em qualquer vaga, depois.

**Ruins — e é preciso dizer em voz alta**

- **A foto não aparece na hora.** São ~1-2 minutos até o site novo subir. O
  painel mostra a troca imediatamente, mas o site público não. Quem esperar
  comportamento de CMS vai estranhar.
- Um build a mais por troca de foto. Irrelevante no volume real, mas é consumo
  de cota que antes não existia.
- O limite de tentativas de login depende do que o Supabase Auth oferece mais
  um travamento em memória por instância — que **não é compartilhado entre as
  instâncias serverless da Vercel**. É proteção parcial, e está escrito aqui de
  propósito para não ser confundida com proteção completa.

## Direito de imagem não é campo opcional

`memory/restrictions.md` e o BLK-008 são explícitos: foto de cliente ou de
equipe só entra no site com autorização registrada. O upload por isso carrega
`autorizacao_imagem` e o painel **exige a marcação quando há pessoa
identificável** antes de deixar publicar. É a única forma de a restrição
sobreviver ao dia em que o dono subir uma foto do salão cheio às 23h de sábado.

O `alt` também é campo do painel, e não enfeite: é requisito de acessibilidade
(`memory/restrictions.md`) e é onde o ADR-007 mora — o texto descreve a cena e
nunca afirma o que a foto não prova.

## Quando reverter

Se a casa passar a trocar foto várias vezes por dia, ou se o Supabase Pro
entrar por outro motivo, o caminho instantâneo volta à mesa. Enquanto a troca
for semanal, esperar 2 minutos custa menos que perder a otimização de imagem
num site que é vendido pela imagem.
