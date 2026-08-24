# Bugs e Pendências Conhecidas — CASA + HAUBERT

## Objetivo
- Registrar bugs conhecidos, workarounds e status
- Evitar rediagnóstico do mesmo problema
- Dar visibilidade ao que está bloqueando entrega

## Contexto
- Fase 0 (Fundação). Ainda não há código de aplicação, logo não há bug de runtime
- O que existe hoje são **bloqueios de insumo**: assets e informações que o
  cliente ainda não entregou e sem os quais a Fase 1 não fecha

## Regras Gerais
- Bug com workaround conhecido é documentado aqui, não só no chat
- Bloqueio de insumo entra aqui até ser resolvido — não vira "todo mundo sabe"
- Bug resolvido sai da tabela ativa e vai para o histórico

## Validações
- Todo item tem dono, impacto e próximo passo?
- Item aberto há mais de 30 dias foi reavaliado?

## Permissões
- Qualquer um registra; o dono do produto prioriza

## Exceções
- Bug de segurança não espera priorização: corrige e depois documenta

## Auditoria
- Revisar a tabela a cada início de fase

## Eventos
- `bug.reported`, `bug.workaround_added`, `bug.resolved`, `blocker.raised`

## Casos de Uso
- "Por que ainda não temos o logo em SVG?"
- "O que falta para o site poder subir?"

## Critérios de Aceite
- [x] Todo bloqueio da Fase 1 está listado
- [x] Cada item tem impacto e próximo passo

---

## Bloqueios ativos (insumos pendentes do cliente)

| ID | Item | Impacto | Workaround | Próximo passo | Status |
|---|---|---|---|---|---|
| BLK-001 | **Logos vetoriais** (CASA e HAUBERT em SVG) | ALTO — logo rasterizado da prancha fica serrilhado em tela retina e não troca de cor por token | Recortar da prancha em PNG @3x para homologação | Pedir ao designer do guia os `.ai`/`.svg` originais | **ABERTO** |
| BLK-002 | **Banco de fotos em alta** | CRÍTICO — o site é visual; as pranchas só têm thumbs de 250–660px | Recortes das pranchas em cartão e ladrilho, nunca em hero — feito, ver [ADR-007](../docs/08_DECISOES/adr-007-fotos-do-deck.md) | Pedir o acervo original ou orçar ensaio (ver `restrictions.md`) | **CONTORNADO** |
| BLK-009 | **Direito de uso das imagens do deck na web** | ALTO — o guia foi contratado como apresentação; uso público em site é outra finalidade, e a origem das fotos (geradas, licenciadas ou próprias) não está declarada em `brand/` | Nenhum — as imagens já estão no site sob o ADR-007 | Confirmar com o designer do guia quem produziu as fotos e se a licença cobre uso em site público | **ABERTO** |
| BLK-003 | **Endereço, telefone e horário oficiais** | CRÍTICO — sem isso não há SEO local, nem schema.org, nem rodapé | Placeholders marcados `[[PENDENTE]]` no conteúdo | Confirmar com a casa | **ABERTO** |
| BLK-004 | **Cardápio real** (cortes, drinks, café, preços) | ALTO — bloqueia a página de cardápio da Fase 2 | Usar os 6 cortes já nomeados no guia (Ancho, Rib Eye, T-Bone, Picanha, Filé Mignon, Brisket) sem preço | Pedir cardápio atualizado em texto | **ABERTO** |
| BLK-005 | **Canal de reserva** (número de WhatsApp Business ou ferramenta atual) | CRÍTICO — é o CTA principal do site | Nenhum | Confirmar o número e se há WhatsApp Business API | **ABERTO** |
| BLK-006 | **Domínio** | ALTO — bloqueia o lançamento | Publicar em `*.vercel.app` para homologação | Cliente decide e registra | **ABERTO** |
| BLK-007 | **Licença da fonte Druk** | MÉDIO — o guia especifica Druk nos títulos de steak | Substituta gratuita — ver [ADR-003](../docs/08_DECISOES/adr-003-tipografia-substituta.md) | Cliente decide se compra | **CONTORNADO** |
| BLK-008 | **Autorização de imagem** de equipe e clientes | MÉDIO — LGPD e direito de imagem | Publicar só foto sem rosto identificável até haver termo | Termo de autorização assinado | **ABERTO** |

## Bugs de aplicação

Nenhum — não há código de aplicação ainda (Fase 0).

> Formato para quando houver:
>
> | ID | Descrição | Causa | Impacto | Workaround | ETA | Status |
> |---|---|---|---|---|---|---|
> | BUG-001 | O que quebra, em uma frase | Causa raiz confirmada (não suposição) | CRÍTICO / ALTO / MÉDIO / BAIXO | O que fazer enquanto não tem fix | Data | ABERTO |
>
> Ambiente: navegador + SO + dispositivo. Bug de mobile sem o modelo do
> aparelho é bug não reproduzível.

## Riscos técnicos vigiados (ainda não são bugs)

| Risco | Por que preocupa | Mitigação planejada |
|---|---|---|
| Flash de tema errado (FOUC) na troca Dia/Noite | O modo é escolhido por hora do dia + preferência salva; se resolver só no cliente, a página pisca | Script inline no `<head>` que aplica `data-modo` antes da primeira pintura — ver `docs/02_DESIGN_SYSTEM/` |
| Contraste do modo Noite | Fundo `#131212` com texto `#D0BDA1` precisa passar AA | Tokens de texto separados dos tokens de superfície; teste de contraste no CI |
| Peso das fotos de fogo | Foto escura com granulado comprime mal | `astro:assets` + AVIF + limite de 200kb por imagem acima da dobra |
| Reserva por WhatsApp não é rastreável | Sem métrica de conversão real na Fase 1 | Evento de clique no CTA + UTM no link `wa.me` |

## Histórico (resolvidos)

Nenhum ainda.
