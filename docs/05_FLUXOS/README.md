# 05, Fluxos

## F-001, Reserva (o fluxo que justifica o site)

**Princípio nº1: no máximo três toques.** Fase 1 termina no WhatsApp (ADR-005).

```
Qualquer tela
   │  [botão fixo no rodapé mobile]
   ▼
① toque  → abre a folha de reserva (bottom sheet, ilha React)
   │        • quantas pessoas  (chips: 2 · 4 · 6 · +)
   │        • quando           (hoje · amanhã · escolher data)
   │        • marca já pré-selecionada pelo modo ativo
   ▼
② toque  → escolhe pessoas e horário
   ▼
③ toque  → "Chamar no WhatsApp"
   │
   ▼
wa.me/<numero>?text=<mensagem no tom da marca>
```

**Mensagem pré-preenchida** (montada em `src/lib/reservas.ts`):

> *Oi! Queria reservar uma mesa no HAUBERT para 4 pessoas, sexta às 20h.*

**Regras**
- O botão nunca some ao rolar. No mobile é `position: fixed`, respeitando `env(safe-area-inset-bottom)`
- A marca da mensagem segue o modo ativo, quem está no modo Noite fala do HAUBERT
- Nenhum dado pessoal é coletado nem armazenado pelo site
- O link carrega UTM e dispara `reserva_click` no analytics, é a métrica da Fase 1
- Desktop abre WhatsApp Web; o telefone fica visível como alternativa
- Sem WhatsApp configurado (BLK-005): degradar para telefone e e-mail, nunca para botão morto

**Fase 3, reserva nativa** (aditiva, não substitutiva):
```
③ toque → envia → POST /api/reserva (servidor)
              → valida com Zod · rate limit por IP
              → insert em reservations (status 'pendente')
              → e-mail para a casa + confirmação para o cliente
              → tela de sucesso com o resumo
```
O botão WhatsApp continua existindo como fallback.

---

## F-002, Chegada e escolha do modo (o *aha moment*)

```
Visitante chega em /
   │
   ▼
Script inline no <head>, ANTES da primeira pintura:
   1. tem preferência salva em localStorage?  → usa ela
   2. senão, hora local ≥ 19h ou < 5h?        → noite
   3. senão                                    → dia
   │
   ▼
Aplica data-modo no <html>  →  tokens resolvem  →  primeira pintura já correta
   │
   ▼
Visitante vê o alternador e entende que existem duas casas
   │
   ├─ toca no alternador → transição de 320ms → salva a escolha
   └─ não toca           → segue no modo do horário
```

**Regras**
- O script é **inline e síncrono**. Se for assíncrono, a página pisca (FOUC), ver `memory/bugs.md`
- A hora define o **padrão**, nunca a prisão: o alternador está sempre disponível
- O alternador tem rótulo textual e `aria-pressed`. Nunca só um ícone de lua
- `/noite` é rota SSR real e indexável, com canônica própria, o SEO da steakhouse não pode depender de JS

---

## F-003, Consulta de cardápio

```
/cardapio  (SSR, cache 5min)
   │
   ▼
buscarCardapio(brandId)          ← camada de serviços
   │
   ├─ seções publicadas da marca ativa, na ordem definida
   └─ itens publicados de cada seção
   │
   ▼
Alternar modo troca a marca → recarrega a seção correspondente
   │
   ▼
CTA de reserva ao fim de cada seção
```

**Regras**
- Só entra o que está `publicado`, a equipe rascunha à vontade
- Preço nulo não renderiza campo vazio: some (Fase 1 não divulga preço, BLK-004)
- Estado vazio com copy da marca: *"O cardápio está sendo atualizado. Volta já."*
- QR code da mesa aponta direto para `/cardapio?modo=noite`, é o uso real

---

## F-004, Agenda cultural

```
/agenda (SSR, cache 5min)
   │
   ▼
buscarAgenda(venueId, { de: hoje, ate: hoje+60d })
   │
   ▼
Lista por data ascendente · evento passado não aparece
   │
   ▼
/evento/[slug] → página compartilhável com OG image
```

**Regras**
- Evento sem `brand_id` é da casa inteira e aparece nos dois modos
- OG image por evento, o compartilhamento no grupo do WhatsApp é o canal real
- Estado vazio: *"A agenda da semana ainda está sendo escrita. Volta amanhã."*

---

## F-005, Publicação pela equipe (Fase 3)

```
/painel  →  sessão verificada NO SERVIDOR (não no cliente)
   │
   ├─ não autenticado → redirect para login, sem emitir HTML do painel
   │
   ▼
Autenticado → e_membro_da_casa(venue_id)?
   │
   ├─ não → 403
   │
   ▼
CRUD de cardápio / agenda / fotos
   │
   ▼
Salvar como rascunho  →  Publicar  →  revalida o cache da rota pública
```

**Regras**
- Toda escrita passa pela RLS; a UI é conveniência, não a barreira
- Upload vai para `midia/venues/{venue_id}/...`, o caminho carrega o isolamento
- Publicar e despublicar são um toque, reversíveis
- Nenhuma ação destrutiva sem confirmação explícita

---

## F-006, Erro e degradação

| Situação | Comportamento |
|---|---|
| Supabase fora do ar | Página estática continua servindo; seções dinâmicas mostram estado vazio com copy da marca, nunca stack trace |
| `brands.tokens` com shape inválido | Cai no token default de `tokens.css`. Site com cor antiga > site sem cor |
| JS desligado | Conteúdo institucional e cardápio funcionam. Reserva degrada para link direto de WhatsApp e telefone |
| Rota inexistente | 404 no tom da marca, com caminho para home, cardápio e reserva |
| Imagem falha | `alt` real aparece; layout não colapsa (proporção reservada) |
