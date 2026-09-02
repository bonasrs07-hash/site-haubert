# 11, Plano de Segurança

> Segurança e custo são parte da **definição de pronto**, não etapa final.
> Restrições legais permanentes: [`memory/restrictions.md`](../../memory/restrictions.md).

## Superfície de risco (o que realmente existe aqui)

Este é um site institucional. A superfície é pequena, e é exatamente por isso
que o risco é subestimado. O que temos:

| Ativo | Sensibilidade | Fase |
|---|---|---|
| Dado de reserva (nome, telefone, e-mail, data) | **Alta**, dado pessoal, LGPD | 3 |
| Credenciais da equipe (painel) | **Alta** | 3 |
| Conteúdo publicado (cardápio, agenda, fotos) | Média, integridade da marca | 2 |
| Foto de clientes e equipe | **Alta**, direito de imagem | 1 |
| Chaves de API | Alta | 1 |

**Não temos** (por escolha de escopo): pagamento, dado financeiro, dado de menor,
dado de saúde. Isso mantém o projeto fora de PCI e reduz drasticamente a
exposição, e é motivo suficiente para não deixar e-commerce entrar por acidente.

## Camada 1, Segredos e chaves

| Regra | Detalhe |
|---|---|
| Nada de segredo no repositório | `.env` no `.gitignore`; só `.env.example` versionado |
| `PUBLIC_*` é público de verdade | Tudo com esse prefixo vai para o bundle. Só a URL do Supabase e a chave `anon` |
| **`service_role` nunca sai do servidor** | Nem em ilha React, nem em `PUBLIC_*`, nem em log. É a falha mais cara desta stack |
| Rotação | Se uma chave vazar: rotacionar no Supabase, invalidar deploy, e registrar em `memory/learnings.md` |

> A chave `anon` no browser **é o desenho correto** do Supabase. Ela não é o que
> protege o dado, a RLS é. Quem trata a `anon` como segredo tende a relaxar na RLS,
> que é o erro que importa.

## Camada 2, Banco (RLS)

**RLS é bloqueio de merge.** Tabela sem policy não entra em `main` *(P-005)*.

Regras vigentes (implementadas em [`supabase/schema.sql`](../../supabase/schema.sql)):

- Leitura pública **só do que está `publicado`** e de casa `ativo`
- Escrita **só para membro da própria casa**, via `e_membro_da_casa(venue_id)`
- `reservations` **não tem policy de leitura pública**, nenhuma
- `reservations` **não tem policy de INSERT para `anon`**: a escrita passa por
  endpoint de servidor com validação (Fase 3)

### Teste de isolamento entre tenants (obrigatório no CI)

```sql
-- JWT de editor da casa A tentando ler a casa B → esperado: 0 linhas
select count(*) from public.reservations where venue_id = '<casa-B>';
select count(*) from public.menu_items    where venue_id = '<casa-B>';
```

Qualquer resultado diferente de zero é vazamento de tenant e bloqueia o deploy.

## Camada 3, Aplicação

| Controle | Como |
|---|---|
| **Validação de entrada** | Formulário de reserva é entrada pública hostil. Validar com Zod no servidor, validação de cliente é UX, não segurança |
| **Sem `select *`** | Campos explícitos em tabela com dado pessoal |
| **Rate limit** | Endpoint de reserva (Fase 3): limite por IP na Edge Function. Sem isso, o formulário é um gerador de spam para a equipe |
| **Auth antes de renderizar** | `/painel/*` verifica sessão **no servidor**, antes de emitir HTML. Esconder no cliente não é proteger |
| **Sem log de dado sensível** | Telefone, e-mail e token nunca em `console.log` nem em log de erro |
| **Escape de conteúdo do banco** | Texto vindo de `menu_items`/`events` é conteúdo de usuário. Sem `set:html` sem sanitização |

## Camada 4, Cabeçalhos e transporte

**Implementado.** Antes disto a produção respondia com **um** cabeçalho de
segurança: o `Strict-Transport-Security`, que a Vercel põe sozinha. Os outros
quatro desta lista não existiam.

São **duas** políticas, e nunca na mesma resposta: duas CSP valem pela
interseção, então deixar a do site alcançar o painel mataria a hidratação do
React.

| Onde | Quem põe | `script-src` |
|---|---|---|
| Site público | `vercel.json`, gerado por `scripts/csp.mjs` | `'self'` + hashes medidos |
| `/painel/*`, `/api/painel/*` | `src/middleware.ts` | `'self' 'unsafe-inline'` |

Os quatro cabeçalhos simples (`X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `X-Frame-Options`) valem para tudo.

```
# site público
Content-Security-Policy: default-src 'self';
  script-src 'self' 'sha256-…' (×4, medidos do build);
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self'; connect-src 'self';
  form-action 'self'; base-uri 'self';
  frame-ancestors 'none'; object-src 'none'; frame-src 'none';
  upgrade-insecure-requests
```

> `font-src 'self'` só funciona porque as fontes são self-hosted via
> `@fontsource` (ADR-003). É segurança e privacidade de graça: sem Google Fonts,
> nenhum IP de visitante vaza para terceiro.

**Três coisas saíram diferentes do que este documento previa, e o porquê:**

1. **Hash, não `nonce`.** A previsão de `nonce` não é possível: página estática
   é a mesma para todo mundo, e `nonce` que se repete não é `nonce`. Os hashes
   do JavaScript embutido são **medidos do build** por `scripts/csp.mjs`, que
   gera o `vercel.json`. O mesmo script roda como `postbuild` e **derruba o
   build** se o commitado divergir do medido. CSP desatualizada não avisa, ela
   bloqueia, e o sintoma seria a troca Dia/Noite morta no site inteiro.

2. **`connect-src`/`img-src` do site não precisam do Supabase.** O documento
   previa isso, mas depois do ADR-008 o site publicado não fala com o banco: o
   build baixa as fotos e serve `/_astro/*.webp`. Quem precisa do Supabase em
   `img-src` é o painel, que mostra o bucket privado por URL assinada.

3. **`style-src` ficou com `'unsafe-inline'`, e é dívida consciente.** O site
   usa atributo de estilo para três variáveis de dado: `--proporcao` (a forma de
   cada foto), `--volta` (a velocidade da faixa) e `--atraso` (a escada da
   animação). Hash de CSP não cobre atributo, e com hash presente o browser
   *ignora* `'unsafe-inline'`, então uma política estrita de estilo entregaria
   foto sem proporção. CSS injetado sem script é um problema pequeno perto de
   `script-src`, que ficou estrito de verdade. **Para quitar:** tirar os três
   atributos do markup, o que a diretriz de "separar CSS do markup" já pede.

Verificado com a CSP ligada, num Chrome de verdade, nas 10 rotas: script de
tema executa, a troca Dia/Noite funciona e persiste, `schema.org` intacto,
`--proporcao` ainda aplica, zero violações. Imagem que não carrega é `lazy` fora
do viewport, conferido contra um controle servido sem CSP, mesmo resultado.

## Camada 5, LGPD

| Exigência | Implementação |
|---|---|
| **Base legal** | Reserva: execução de contrato (Art. 7º, V). Declarada no formulário e no comentário da tabela |
| **Consentimento separado** | Newsletter tem opt-in próprio, desmarcado. Nunca junto do envio da reserva |
| **Minimização** | Coletar só nome, telefone, pessoas e data. E-mail é opcional. Não perguntar CPF, idade nem endereço |
| **Retenção** | 12 meses após a data da reserva → job anonimiza (`anonimizada_em`). Logs: 90 dias |
| **Direito de exclusão** | Página `/privacidade` com e-mail do encarregado e prazo de resposta |
| **Transparência** | Aviso no próprio formulário: o que é coletado, para quê, por quanto tempo |
| **Transferência internacional** | Supabase na região **São Paulo**, dado não sai do país |

**Direito de imagem** (BLK-008): foto de cliente ou de membro da equipe só entra
no site com autorização registrada. Sem termo assinado, publicar apenas imagens
sem rosto identificável.

## Camada 6, Conteúdo e marca

Riscos que não são técnicos mas custam caro:

- **Foto de banco de imagem é proibida** (`memory/restrictions.md`), quebra o
  pilar de autenticidade da marca e expõe a cópias
- **Comunicação de bebida alcoólica** leva aviso de consumo responsável e restrição a +18
- **Sem dark pattern**: escassez inventada, contador falso e opt-out escondido
  estão vetados. A escassez da casa é real ou não é usada

## Checklist de PR (segurança)

- [ ] Nenhum segredo novo no código ou no bundle
- [ ] `service_role` não referenciada em código de cliente
- [ ] Tabela nova tem `enable row level security` **e** policies
- [ ] Teste de isolamento entre tenants passa
- [ ] Entrada de usuário validada **no servidor**
- [ ] Nenhum `console.log` com dado pessoal
- [ ] Rota protegida verifica sessão no servidor
- [ ] Conteúdo vindo do banco é escapado
- [ ] Se coletou dado pessoal novo: base legal, retenção e aviso definidos

## Resposta a incidente

1. **Conter**, rotacionar chave / desabilitar policy / tirar do ar a rota afetada
2. **Avaliar**, houve acesso a dado pessoal? Quantos titulares?
3. **Comunicar**, se houver dado pessoal envolvido, notificar o cliente (a casa)
   imediatamente; a ANPD e os titulares conforme a Art. 48 da LGPD
4. **Corrigir** e registrar em `memory/learnings.md`
5. **ADR `[URGENT]`** se a correção mudar arquitetura

## Auditoria de 2026-09-02

Varredura das seis camadas contra o **banco de produção**, não contra os
arquivos de migration: arquivo é intenção, servidor é fato.

**Corrigido: item despublicado do cardápio vazava pela API pública.** A policy
de leitura de `menu_items` checava apenas o `publicado` da SEÇÃO, mas o item tem
o seu próprio, o painel dá ao dono a caixa "No site" por item, e o site filtra
por ela. O banco não filtrava. Um prato marcado "fora do site" ficava escondido
no site e legível por qualquer pessoa com a chave anônima, que sai no HTML de
toda página. Provado com a chave anônima antes (HTTP 200 com o item) e depois
(`[]`) da migration `003`, e conferido que o dono continua enxergando o item no
painel. O cardápio estava vazio, então nada vazou de fato: era dívida esperando
o primeiro prato despublicado. A policy de `events` sempre checou o próprio
flag; `menu_items` era a exceção.

**Sem achado (verificado, não presumido):** nenhuma chave commitada; a
`service_role` não aparece no bundle do cliente; RLS ligada nas 10 tabelas, com
toda escrita atrás de `e_membro_da_casa`; bucket `midia` privado; caminho do
Storage gerado no servidor, nome enviado pelo usuário nunca vira caminho;
upload validado por *magic bytes* e pelas dimensões do cabeçalho WebP real;
endpoints do painel só aceitam POST e passam todos por `venue_id = casaId`, com
a RLS como segunda camada; sem `select *`; sem log de dado sensível; `venue_members`
sem policy de INSERT, então ninguém se auto-adiciona à equipe; hook de publicação
vem de variável de servidor, com freio no banco e 429.

**Dívidas conhecidas, não corrigidas aqui:**

1. **`anon` tem grant de escrita em todas as tabelas** (padrão do Supabase). Hoje
   quem barra é só a RLS, e ela barra. Mas isso torna a RLS ponto único de
   falha: tabela nova sem policy correta fica escrevível por estranho. Vale
   revogar o que não é usado (`revoke insert, update, delete ... from anon`).
2. **Bucket `midia` sem `file_size_limit` nem `allowed_mime_types` próprios.** A
   validação é toda da aplicação; quem tivesse a sessão do dono poderia subir
   direto pela API do Storage. Definir os limites no bucket é defesa em
   profundidade barata.
3. **`set:html` com `JSON.stringify` no `ld+json`.** Não é explorável hoje: todo
   texto passa por `texto()`, que remove `<` e `>`, e a CSP nova barra
   manipulador inline. Mas a proteção mora longe do lugar do risco: quem
   escreve um campo novo precisa lembrar de passá-lo por `texto()`. Escapar o
   sinal de menor como `<` na hora de serializar o JSON fecharia isso no
   lugar certo, que é onde o dado vira HTML.
4. **`path-to-regexp@6.1.0` (ReDoS, GHSA-9wv6-86v2-598j)** viaja dentro da função
   publicada, via `@vercel/routing-utils` do adapter. Não há correção limpa: o
   `@astrojs/vercel@11.0.9` continua fixando a versão vulnerável e apenas
   adiciona a corrigida ao lado, e o que o `npm audit` sugere é downgrade para a
   série 8, incompatível com Astro 7. Acompanhar release do adapter.
5. **Freio de login em memória**, por instância. Já documentado em `lib/freio.ts`
   e no ADR-008: atrasa força bruta, não impede. A defesa real é o limite do
   Supabase Auth mais senha longa.

## Revisão

- Checklist de PR: todo merge
- Este plano: a cada início de fase
- Restrições legais: anual (`memory/restrictions.md`)
