# Restrições Permanentes — CASA + HAUBERT

## Objetivo
- Documentar limites e restrições que guiam decisões
- Evitar caminhos bloqueados (custo, legal, ético, técnico)
- Forçar atualização de restrições vencidas

## Contexto
- Restrição = barreira de entrada; exceção exige ADR
- Revisão: trimestral

## Regras Gerais
- Nenhuma restrição ignorada sem ADR formal de exceção
- Restrições legais/compliance têm prioridade máxima
- Restrição vencida é removida; não acumula dívida técnica

## Validações
- Restrição tem justificativa concreta?
- Data de revisão planejada está clara?

## Permissões
- Dono/compliance: aprova exceção de restrição legal — **Matheus Bonato**
- Tech lead: aprova exceção técnica — **Matheus Bonato**

## Exceções
- Restrição legal pode ser violada por decisão explícita do dono com ADR (raro)

## Auditoria
- Revisar todas as restrições contra realidade trimestralmente
- Exceção aprovada vira ADR público

## Eventos
- `restriction.added`, `restriction.excepted`, `restriction.lifted`

## Casos de Uso
- "Posso usar a fonte Druk?"
- "Posso guardar o telefone da reserva sem consentimento?"
- "Posso criar essa tabela sem RLS agora e arrumar depois?"

## Critérios de Aceite
- [x] Cada categoria tem no mínimo 1 restrição preenchida
- [x] Restrições com data de revisão clara
- [x] Exceções aprovadas linkadas a ADR

---

## Restrições Técnicas

| Restrição | Detalhes | Revisão | Exceção |
|---|---|---|---|
| **RLS é definição de pronto** | Tabela nova sem policy de RLS não entra em `main`. Vale inclusive para tabela "só de leitura pública" | 2026-11-24 | Nenhuma. É bloqueio de merge |
| **`service_role` nunca no cliente** | A chave só existe em contexto de servidor (endpoint Astro / Edge Function). Nunca em `PUBLIC_*`, nunca em ilha React | 2026-11-24 | Nenhuma |
| **Zero JS por padrão** | Ilha React nova exige justificativa no PR. Conteúdo é Astro estático | 2026-11-24 | Aprovação do tech lead no PR |
| **Sem cor literal em componente** | Cor sai de token (`var(--cor-*)`). `#131212` escrito num componente é bug de white-label | 2026-11-24 | Nenhuma. Ver ADR-002 |
| **Sem dependência de runtime pesada** | Nada de jQuery, Bootstrap, biblioteca de animação de 100kb. Orçamento: < 60kb de JS na home | 2026-11-24 | ADR se o ganho de UX justificar |
| **Imagem sempre otimizada** | `astro:assets` com AVIF/WebP + `loading="lazy"` abaixo da dobra. Foto crua de 5MB não sobe | 2026-11-24 | Nenhuma |

## Restrições Legais / Compliance

| Restrição | Detalhes | Prioridade | Revisão |
|---|---|---|---|
| **LGPD — base legal da reserva** | Nome, telefone, e-mail e data coletados para execução de contrato (Art. 7º, V). Informar a finalidade no próprio formulário | CRÍTICA | 2027-08-24 (anual) |
| **LGPD — consentimento para newsletter** | Opt-in explícito e separado do checkbox de reserva. Nada de caixa pré-marcada | CRÍTICA | 2027-08-24 (anual) |
| **Retenção de dados de reserva** | Máximo 12 meses após a data da reserva; depois, anonimizar. Logs: 90 dias | CRÍTICA | 2027-08-24 (anual) |
| **Canal de exclusão** | Página `/privacidade` com e-mail de contato do encarregado e prazo de resposta | ALTA | 2027-08-24 (anual) |
| **Bebida alcoólica** | Qualquer comunicação de drink leva aviso de consumo responsável e restrição a maiores de 18 | ALTA | 2027-08-24 (anual) |
| **Direito de imagem** | Foto de cliente ou equipe no site exige autorização registrada. Sem autorização, não publica | ALTA | 2027-08-24 (anual) |
| **Dados de menores** | Não coletar dado de menor de 18. Reserva não pergunta idade | CRÍTICA | 2027-08-24 (anual) |

## Restrições de Custo (Fase Bootstrap)

**Diretriz Geral**: priorizar meios **gratuitos**. Toda implementação com custo relevante é **ADIADA por padrão**, salvo decisão explícita do dono.

### Checklist obrigatório ao esbarrar em algo pago

- [ ] **Custo aproximado**: R$ X/mês
- [ ] **Alternativa gratuita**: qual? Por que não usável agora?
- [ ] **Importância/Impacto**: Crítica / Alta / Média / Baixa
- [ ] **Recomendação**: investir AGORA ou MAIS PRA FRENTE?
- [ ] **Decisão do dono**: [reter até decisão explícita]

### Itens pagos identificados

| Item | Custo aprox | Alternativa grátis | Impacto | Status |
|---|---|---|---|---|
| **Fonte Druk** (Commercial Type) | ~US$ 200 licença web | Bebas Neue / Anton / Archivo Expanded (SIL/OFL) | ALTA (é o display do guia) | **[ADIADO]** — ver ADR-003 |
| **Domínio próprio** (.com.br) | ~R$ 40/ano | Subdomínio `.vercel.app` para homologação | CRÍTICA para lançar | **[PENDENTE DECISÃO DO CLIENTE]** |
| Ensaio fotográfico profissional | R$ 1.500-4.000 | Frames do acervo do Instagram em alta | ALTA (o site é visual) | **[PENDENTE]** — sem foto boa o site não entrega |
| Supabase Pro | US$ 25/mês | Free tier (500MB, 50k MAU) — sobra para o volume atual | BAIXA | **[ADIADO até Fase 3]** |
| Vercel Pro | US$ 20/mês | Hobby — suficiente para site institucional | BAIXA | **[ADIADO]** |
| Resend / e-mail transacional | Grátis até 3k/mês | Free tier atende confirmação de reserva | MÉDIA | **[GRÁTIS — usar free tier na Fase 3]** |
| Plausible Analytics | US$ 9/mês | Vercel Analytics (Hobby) ou Umami self-host | BAIXA | **[ADIADO — usar Vercel Analytics]** |

**Processo**: dono revisa a lista trimestralmente e aprova conforme a receita do projeto.

## Restrições de Produto

| Restrição | Detalhes | Por quê | Exceção |
|---|---|---|---|
| **Reserva em 3 toques** | Qualquer fluxo que passe de 3 toques até o envio da reserva é reprovado | Princípio nº1 (`CLAUDE.md`) | Nenhuma |
| **Multi-tenancy obrigatório** | Código novo assume N casas; não hardcoda marca, cor ou nome | Roadmap Fase 4 (produto) | Refatorar antes do merge — ADR-002 |
| **Sem hardcode de identidade** | Tema, cores, logo, copy e horário vêm da config do tenant/marca | White-label | Usar os tokens, nunca constante de CSS |
| **A copy vem de `brand/`** | Frase nova no site precisa existir no guia SOCIAL DNA ou ser aprovada pelo cliente | A marca já existe; o dev não é copywriter | Aprovação explícita do dono da marca |
| **Sem lock-in** | Conteúdo exportável em JSON/CSV a qualquer momento | Confiança + o cliente é dono do conteúdo | Nunca |
| **Sem carrinho / e-commerce na Fase 1-3** | O site leva à mesa, não vende produto online | Escopo fechado; evita PCI e fiscal | ADR novo se a casa quiser gift card |

## Restrições Éticas

| Restrição | Detalhes | Revisão |
|---|---|---|
| **Sem dark patterns** | Nada de contagem regressiva falsa, "restam 2 mesas" inventado ou opt-out escondido. A escassez da casa é real ou não é usada | Contínuo |
| **Sem foto de banco de imagem** | Só foto da casa, da equipe e dos clientes reais. Foto de steak genérico de stock é proibida | Contínuo |
| **Transparência de automação** | Se resposta de reserva for automática, dizer que é automática | Contínuo |
| **Acessibilidade não é opcional** | Contraste mínimo AA nos dois modos, `alt` real em toda imagem, navegação por teclado | Contínuo |

---

## Plano de Revisão

- **Próxima revisão legal/compliance**: 2027-08-24
- **Próxima revisão técnica**: 2026-11-24
- **Próxima revisão de custo**: 2026-11-24
- **Proprietário de todas as seções**: Matheus Bonato

## Exceções Aprovadas (ADRs)

| Restrição | ADR | Data Exceção | Contexto |
|---|---|---|---|
| Fonte display do guia (Druk) | [ADR-003](../docs/08_DECISOES/adr-003-tipografia-substituta.md) | 2026-08-24 | Druk é paga; usar substituta gratuita até haver decisão de compra |
