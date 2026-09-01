# Diretrizes de Desenvolvimento, CASA + HAUBERT

> Constituição do projeto. Vale mais que preferência pessoal e mais que o que
> "já está no código". Conflito entre este arquivo e qualquer outro: este vence.

**Produto:** site oficial da casa, CASA Coffee Colab (dia) + HAUBERT Steak &
Grillhouse (noite), Novo Hamburgo / RS.
**Uma essência. Dois conceitos. Uma conexão que fica.**

---

## Princípio nº 1, INTUITIVIDADE (inegociável)

**Reservar não pode custar mais de três toques a partir de qualquer tela.**

O foco principal do sistema é **fazer o visitante entender a casa em 2 segundos
e conseguir reservar sem pensar**. Em qualquer decisão, priorize este princípio
acima de conveniência técnica. Regras práticas:

- **O CTA de reserva é persistente.** Existe em toda tela, em posição fixa no
  mobile. Nenhuma seção pode empurrá-lo para fora do alcance do polegar.
- **A troca Dia/Noite é auto-explicativa.** Sem tutorial, sem tooltip
  obrigatório: o rótulo, o ícone e a mudança de paleta explicam sozinhos.
- Estados sempre visíveis: carregando, erro, vazio e sucesso com feedback humano.
- Prevenção de erro > mensagem de erro.
- Consistência total com o design system (`docs/02_DESIGN_SYSTEM/`).
- **Contraste é requisito, não enfeite.** O site é lido no celular, na mesa, com
  luz baixa. Mínimo AA (4.5:1) em texto de corpo, nos dois modos.

## Fonte de verdade (leia antes de qualquer mudança relevante)

- **`memory/`**, identidade, decisões, padrões, aprendizados e restrições.
  Consultar antes de decisões de produto/arquitetura.
- **`brand/`**, o guia SOCIAL DNA original (16 pranchas) + a extração em
  `brand/BRAND-DNA-EXTRAIDO.md`. **A marca não se inventa aqui: ela já existe.**
  Cor, frase e tom saem de `brand/`, nunca do gosto de quem está codando.
- **`docs/`**, regras de negócio (`03_REGRAS_DE_NEGOCIO/`), design system
  (`02_DESIGN_SYSTEM/`), fluxos, modelagem, ADRs (`08_DECISOES/`) e o plano de
  segurança (`11_SEGURANCA/`).
- **ADR-001** define a stack vigente; ADRs em `docs/08_DECISOES/` registram as
  decisões de arquitetura.
- Schema do banco: `supabase/schema.sql`.
- Se doc e código conflitarem, a documentação prevalece, e deve ser corrigida
  quando estiver errada.
- **Produto = plataforma multi-tenant de casa (venue), servindo hoje um único
  cliente.** O tenant é a casa; CASA e HAUBERT são duas **marcas** do mesmo
  tenant. Todo código novo assume **múltiplos tenants** e é **adaptável por
  estabelecimento**: nada de marca, nome, cor, logo ou regra de cliente
  hardcodada, identidade vem do tenant. Ver ADR-002.

## Processo de trabalho

1. **Planejar TUDO antes de executar**, escopo fechado, sem retrabalho.
2. Builds multi-parte → fan-out paralelo com **dono exclusivo por arquivo**
   (dois agentes nunca tocam o mesmo arquivo).
3. **Sintetizar e VALIDAR no fim**, revisar cada entrega, rodar testes e build.
4. Tarefa de peça única não ganha fan-out.

## Custo, priorizar o gratuito (fase: bootstrap)

Tudo em tier gratuito: **Vercel Hobby + Supabase Free**. Nenhum serviço pago
aprovado. Toda implementação que exija investimento é **adiada por padrão**,
salvo decisão explícita do dono. Ao esbarrar em algo pago, apresente: custo
aproximado, alternativa gratuita, impacto, e recomendação (agora × depois), o
dono decide. Detalhes em `memory/restrictions.md`.

> Pendências pagas conhecidas: domínio próprio e a fonte **Druk** (paga). O
> design system usa substitutas gratuitas até haver decisão, ver ADR-003.

## Segurança (obrigatório em todo código novo)

- **Nunca** hardcodar chaves, URLs de API, secrets ou senhas, usar
  `import.meta.env.PUBLIC_*` para o que é público e variável de servidor
  (sem prefixo `PUBLIC_`) para o resto.
- **A `service_role` do Supabase nunca sai do servidor.** Nem em ilha React,
  nem em componente `client:*`, nem em variável `PUBLIC_*`.
- **Nunca** `select *` em tabelas sensíveis, sempre campos explícitos.
- **Sempre** validar inputs do usuário antes de qualquer operação no banco
  (reserva é formulário público: trate como entrada hostil).
- **Nunca** logar dados sensíveis (telefone, e-mail, tokens).
- **Sempre** verificar autenticação antes de renderizar rota protegida (`/painel`).
- Ao criar tabela/função nova, **RLS é definição de pronto**, tabela sem RLS
  não entra em `main`.
- Plano de segurança completo em `docs/11_SEGURANCA/`.

## Padrões de código

- **Astro para tudo que é conteúdo; ilha React só onde há estado real**
  (troca Dia/Noite, formulário de reserva, carrossel). Ilha nova exige
  justificativa no PR, JS por padrão é zero.
- Variáveis/funções em português para nomes de domínio (`abrirReserva`,
  `cardapioDaNoite`), inglês para padrões técnicos (`handleSubmit`).
- Sempre tratar erros de chamadas ao backend com `try/catch` ou checagem de
  `.error`.
- Logs de atividade fire-and-forget, nunca bloquear a operação principal.
- Rodar `npm run test` antes de commitar; funções puras nascem com teste.
- **Separar CSS do markup**, estilo por token, para white-label. Cor literal
  (`#131212`) em componente é bug: use o token (`--cor-superficie`).
- Todo acesso ao Supabase passa por `src/lib/`, componente nunca fala com o
  banco direto.

## Pontuação, vírgula no lugar do travessão

**NEGATIVE PROMPT (vale para código, comentário, documentação, copy do site,
`alt` de imagem, mensagem de commit e descrição de PR): não escreva travessão.
Escreva vírgula.**

Proibido: **em dash (U+2014)** e **horizontal bar (U+2015)**. A regra cita os
caracteres por codepoint de propósito, para que a verificação abaixo continue
podendo exigir zero ocorrência no repositório inteiro.

Quando a vírgula não resolver, nesta ordem: reescreva a frase, use dois-pontos,
use parênteses. Nunca troque o travessão por hífen solto (` - `): em Markdown
isso vira item de lista e quebra o documento.

Duas exceções, e só estas duas:

- **en dash (U+2013), `–`**, apenas em intervalo: `19h–01h`, `250–350px`,
  `boards 001–016`. Intervalo não vira vírgula, `19h,01h` diz outra coisa.
- **Caracteres de desenho de caixa** (`─ │ ┌ └ ├ ┼ ┬ ▼`) em diagrama ASCII.
  São desenho, não pontuação.

Motivo: uniformidade de voz num repositório escrito com apoio de agentes. O
travessão é a pontuação que mais entrega texto de máquina, e a casa escreve
como quem fala.

Conferir antes de commitar (tem que sair vazio):

```sh
git ls-files | xargs grep -nIP '\xe2\x80\x94|\xe2\x80\x95'
```

## Stack

- **Astro 7** (`output: 'static'` + adapter), HTML estático por padrão; rota que precisar de SSR opta com `export const prerender = false`
- **Tailwind CSS** com tokens da marca em CSS custom properties
- **Ilhas React** pontuais (`client:idle` / `client:visible`)
- **Supabase**, Postgres, Auth, Storage, RLS (região São Paulo)
- **Deploy: Vercel** (Hobby), build automático a partir do repositório
- Testes: Vitest · Lint: ESLint + Prettier

Detalhes e o porquê em `docs/01_ARQUITETURA/` e **ADR-001**.
