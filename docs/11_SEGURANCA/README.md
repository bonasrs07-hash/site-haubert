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

Configurar na Vercel:

```
Content-Security-Policy: default-src 'self';
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co;
  font-src 'self';
  script-src 'self';
  frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

> `font-src 'self'` só funciona porque as fontes são self-hosted via
> `@fontsource` (ADR-003). É segurança e privacidade de graça: sem Google Fonts,
> nenhum IP de visitante vaza para terceiro.
>
> O script inline de tema (ADR-004) exige um `nonce` na CSP, ou vira a única
> exceção documentada. Não usar `'unsafe-inline'` genérico.

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

## Revisão

- Checklist de PR: todo merge
- Este plano: a cada início de fase
- Restrições legais: anual (`memory/restrictions.md`)
