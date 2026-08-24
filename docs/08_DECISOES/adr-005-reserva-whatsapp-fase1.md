# ADR-005: Reserva por WhatsApp na Fase 1, reserva nativa na Fase 3

## Status
Accepted — 2026-08-24

## Contexto

Reservar mesa é a conversão nº1 do site e o Princípio nº1 do projeto: **três
toques, no máximo**. Hoje a casa recebe reserva por DM do Instagram — canal que
perde pedido, não tem histórico e depende de alguém olhando o celular.

Há duas maneiras de resolver:

- **Nativa**: formulário → grava em `reservations` → e-mail/notificação para a
  casa → confirmação para o cliente
- **WhatsApp**: botão → abre `wa.me` com mensagem pré-preenchida → a equipe
  responde no canal que já usa

O que pesa na decisão:

1. **A equipe já vive no WhatsApp.** Um painel novo compete com o hábito
   instalado; reserva que chega em lugar que ninguém olha é reserva perdida.
2. **Reserva nativa sem confirmação é pior que WhatsApp.** Se o cliente envia o
   formulário e ninguém confirma, a experiência quebra — e a culpa vai para o site.
3. **Confirmação exige processo, não só código**: quem responde, em quanto tempo,
   o que fazer com overbooking. Isso ainda não existe na casa.
4. **LGPD**: guardar nome, telefone e e-mail em banco exige base legal, política
   de retenção e canal de exclusão. Via WhatsApp, o dado nunca chega ao nosso banco.
5. **BLK-005** (`memory/bugs.md`): o número oficial de WhatsApp Business ainda
   não foi confirmado pelo cliente.

## Decisão

**Fase 1 — reserva por WhatsApp com mensagem pré-preenchida.**

- Botão persistente em todas as telas (`position: fixed` no mobile)
- O usuário escolhe **quantas pessoas** e **quando** numa ilha React leve;
  o botão monta o deep link `wa.me`
- Mensagem pré-preenchida no tom da marca, já identificando a marca escolhida:
  > *"Oi! Queria reservar uma mesa no HAUBERT para 4 pessoas, sexta às 20h."*
- **Três toques**: abrir → escolher pessoas/horário → enviar
- Nenhum dado pessoal transita ou é armazenado pelo site
- O link carrega UTM e dispara evento de analytics no clique — é a métrica de
  conversão da Fase 1

**Fase 3 — reserva nativa**, quando existirem: painel da equipe em uso, processo
de confirmação definido com a casa, e e-mail transacional configurado.
A migração é aditiva: o botão WhatsApp continua como fallback.

## Alternativas Consideradas

**Reserva nativa já na Fase 1**
- Prós: dado próprio, histórico, métrica limpa, base para CRM
- Contras: exige processo de confirmação que a casa ainda não tem; cria
  obrigação de LGPD antes de haver benefício; risco alto de reserva não
  respondida. Adiado para a Fase 3, não descartado

**Ferramenta de terceiro (OpenTable, Get In, ReservaFácil)**
- Prós: pronto, com confirmação e no-show tracking
- Contras: mensalidade (contra a restrição de custo), tira o visitante do site
  no momento da conversão e leva a identidade visual embora. Reprovado

**Formulário que envia e-mail, sem banco**
- Prós: sem tabela, sem RLS, sem retenção
- Contras: e-mail é pior que WhatsApp para uma equipe de salão — ninguém
  responde caixa de entrada durante o serviço. Reprovado

**Só telefone**
- Prós: zero implementação
- Contras: fricção alta no público 25-40, que não liga. Reprovado

## Consequências

**Positivas**
- Fase 1 entrega a conversão sem depender de processo interno que ainda não existe
- Zero dado pessoal no nosso banco → superfície de LGPD muito menor na Fase 1
- A casa recebe a reserva onde já está olhando
- Custo zero

**Negativas / riscos**
- **Métrica cega**: sabemos quantos clicaram, não quantos reservaram. Mitigação:
  combinar clique com a contagem manual da casa por 30 dias para achar a taxa
- **Sem histórico de cliente** → nenhuma base para CRM/recorrência na Fase 1.
  Aceito; é objetivo da Fase 3
- **Depende de o cliente ter WhatsApp Business ativo e atendido** — BLK-005
- Deep link `wa.me` se comporta diferente em desktop (abre WhatsApp Web).
  Mitigação: testar nos dois e oferecer telefone como alternativa visível

## Referências
- `docs/05_FLUXOS/README.md` — o fluxo de reserva desenhado
- `memory/bugs.md` — BLK-005 (número de WhatsApp pendente)
- `CLAUDE.md` — Princípio nº1
