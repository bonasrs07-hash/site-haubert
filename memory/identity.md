# Identidade do Produto, CASA + HAUBERT

## Objetivo
- Documentar a identidade, visão e diferencial do produto
- Guiar decisões de produto, design e comunicação
- Manter coerência em todos os pontos de contato com o usuário

## Contexto
- Mercado/vertical: hospitalidade, coffee shop + steakhouse autoral, Novo Hamburgo / Vale dos Sinos, RS
- Estágio: **Fase 0, Fundação** (marca madura, presença digital inexistente fora do Instagram)
- Competidores diretos: steakhouses e cafeterias da região com site genérico de template
  ou apenas Instagram + iFood; nenhum concorrente local opera narrativa de marca neste nível

## Regras Gerais
- Identidade é fonte de verdade para mensagens, tone of voice, visual
- **A marca já existe.** Nada aqui é invenção: tudo vem do guia SOCIAL DNA
  (ago/2025), extraído em `brand/BRAND-DNA-EXTRAIDO.md`
- Personas e públicos-alvo devem guiar todo novo recurso
- Posicionamento não muda sem revisão de mercado

## Validações
- Cada mensagem pública alinha com a fórmula de posicionamento?
- Copy nova existe em `brand/` ou é invenção do desenvolvedor?
- Personas refletem pesquisa real de usuário?

## Permissões
- Dono do produto: **Matheus Bonato** (ajusta propósito, persona, roadmap)
- Cliente (a casa): dono do conteúdo, cardápio, agenda, fotos, horário
- Design/marketing: aplica tom e identidade visual

## Exceções
- Decisões de posicionamento overnight exigem ADR

## Auditoria
- Revisar identidade trimestralmente contra mercado
- Revisar contra `brand/` sempre que a casa publicar novo guia

## Eventos
- `product.identity_defined`, `product.positioning_updated`, `persona.identified`

## Configurações Futuras
- Testes de posicionamento com clientes reais da casa
- Pesquisa de marca (awareness, recall) na base de 42K seguidores somados

## Casos de Uso
- Briefar novo membro do time
- Validar novo recurso contra identidade
- Decidir se entra/sai roadmap

## Critérios de Aceite
- [x] Propósito central claro (herdado do guia SOCIAL DNA)
- [x] Personas documentadas com dores reais
- [x] Tom de voz com exemplos ✅ e ❌
- [x] Roadmap definido até Fase 4
- [ ] Validar personas com 3+ clientes reais da casa

---

## Propósito Central

### Visão
Em 5 anos, "casa" não é o lugar onde as pessoas comem, é o lugar a que elas
dizem que pertencem. O site é a porta dessa casa: quem chega pelo Instagram,
pelo Google ou pelo QR code da mesa entra na mesma história, e sai com mesa
marcada. E o que for construído aqui vira o padrão que outras casas do Sul
vão querer copiar, e depois contratar.

### Propósito
O que o site CASA + HAUBERT faz e por quê
- **Problema que resolve:** a casa vive só no Instagram. Quem descobre a marca
  não acha cardápio, nem agenda, nem canal de reserva fora do DM; o Google não
  indexa nada. A demanda que o conteúdo gera vaza no meio do caminho.
- **Como resolvemos:** um site que troca de pele entre **Dia (CASA)** e
  **Noite (HAUBERT)**, a mesma metáfora que a casa já vive fisicamente às 19h,
  com cardápio, agenda cultural e reserva em até três toques, e um painel onde
  a própria equipe atualiza tudo sem depender de desenvolvedor.
- **Impacto esperado:** transformar seguidor em mesa ocupada; deixar de perder
  reserva no DM; aparecer no Google para "steakhouse Novo Hamburgo" e
  "café Novo Hamburgo".

## Público-Alvo

| Segmento | Perfil | Contexto | Necessidade |
|---|---|---|---|
| Trabalho remoto / dia | 25-40, autônomo ou remoto | Procura café bom para ficar 3 horas | Saber se tem wi-fi, tomada, ambiente e se abre agora |
| Jantar / noite | 30-50, renda média-alta | Marca sexta ou data especial | Ver cortes, ambiente e preço antes de decidir; reservar rápido |
| Cultura / eventos | 22-35, segue o Instagram | Quer saber o line-up da semana | Agenda confiável de DJs, collabs e datas |
| Turista regional | 28-55, vem de Porto Alegre / Serra | Pesquisa no Google antes de vir | Endereço, horário, cardápio e reserva num lugar só |

## Valores
- **Autenticidade**: mostrar o que a casa é, não o que renderiza bonito. Foto real, gente real.
- **Conexão**: cada tela existe para aproximar pessoa de pessoa, não para exibir a casa.
- **Experiência**: do primeiro café ao último brinde, a jornada digital respeita a jornada física.
- **Design & Atmosfera**: luz, textura e ritmo. O site tem que *parecer* a casa.
- **Hospitalidade**: receber bem é o nosso padrão, inclusive em mensagem de erro.
- **Cultura**: música, arte, esporte, moda e a cidade. A casa é parte do movimento.

## Posicionamento

**Para** quem vive Novo Hamburgo e o Vale dos Sinos e escolhe onde encontrar
gente, de dia com café, de noite com fogo /
**que** hoje só encontra a casa no Instagram e desiste no meio do caminho /
**CASA + HAUBERT** é a casa digital de duas culturas no mesmo endereço /
**que** mostra qual é o ritmo agora (dia ou noite) e leva à reserva em três
toques /
**Diferente de** site de template de restaurante, link na bio e cardápio em PDF /
**entrega** a mesma atmosfera da casa, na tela, e mesa marcada no fim.

## Tom de Voz

**Princípios**: Próximo · Autêntico · Inspirador · Com personalidade · Acolhedor

**Como a gente fala** (do guia SOCIAL DNA):
- Mensagens claras e diretas. Conversa de igual para igual.
- Humor inteligente e leve. Sensibilidade e empatia.
- Vocabulário simples, mas cheio de significado.
- Estética nas palavras e nas imagens. Respeito em todas as comunicações.
- Sem formalidade. Sem exagero. Tudo com propósito.

**Exemplos**:
- ✅ "Depois das 19h, a casa muda de ritmo. Vem ver."
- ✅ "Mesa para quantos? A gente cuida do resto."
- ❌ "Realize sua reserva através do nosso sistema de agendamento online."
- ❌ "A melhor experiência gastronômica da região!"

**Tom por marca**:
- **CASA**, próximo, humano, moderno, convidativo. Luz. Leveza. Encontro.
- **HAUBERT**, confiante, direto, maduro, apaixonado pelo que faz. Fogo. Força. Tradição.

## Manifesto (versão 1.0, herdado do guia)
1. **Don't sell the place. Make people want to belong.**, não vendemos mesa, criamos pertencimento
2. **O dia alimenta. A lenha transforma. A casa conecta. A memória fica.**, a jornada é uma só
3. **Verdade aquece. Verdade conecta. Verdade fica.**, se não representa quem somos, não entra

## Personas

### Ana, 32, trabalha remoto
- **Contexto**: designer freelancer, mora a 10 min da casa, procura lugar para render 3 horas de manhã
- **Dores**: não sabe se tem tomada e wi-fi; não sabe se está aberto agora; odeia descobrir só chegando
- **Objetivos**: encontrar um lugar bonito e funcional; virar cliente de rotina
- **Sucesso**: abre o site no celular, vê que é modo Dia, confirma horário e vai

### Rafael, 38, jantar de sexta
- **Contexto**: marca o jantar do casal ou do grupo do trabalho, decide na quinta à noite
- **Dores**: não acha cardápio nem preço; mandar DM e esperar resposta é fricção demais; medo de chegar e não ter mesa
- **Objetivos**: ver os cortes e o ambiente, decidir rápido, garantir a mesa
- **Sucesso**: entra pelo Instagram, vê a picanha e o salão à noite, reserva em 3 toques

### Júlia, 27, cultura e eventos
- **Contexto**: segue @casa.coffee pelos eventos, vai ao In The Flow e ao Matcha Club
- **Dores**: a agenda vive em story que expira; nunca sabe quem toca no sábado
- **Objetivos**: saber o line-up com antecedência, chamar os amigos
- **Sucesso**: acha a agenda da semana e compartilha o link no grupo

## Princípios do Produto
- **Intuitividade acima de tudo** (sem manual), reservar em 3 toques
- **A marca vem do dado**, não do código, zero cor ou nome hardcodado
- **Mobile-first e legível no escuro**, o uso real é celular, na mesa, à noite
- **Rápido em 4G ruim**, HTML estático por padrão; imagem otimizada é requisito
- **O cliente é dono do conteúdo**, a equipe atualiza cardápio e agenda sozinha
- Dados são do cliente (zero lock-in)

## Identidade Visual (marca)

> Extração completa e hex amostrados do original: `brand/BRAND-DNA-EXTRAIDO.md`.
> Tokens de implementação: `docs/02_DESIGN_SYSTEM/`.

- **Modo Dia (CASA)**, `#DACFBB` areia · `#A0A083` sage · `#555123` oliva ·
  `#232322` tinta · `#BE6A44` terracota. Claro, natural, urbano, daylight.
- **Modo Noite (HAUBERT)**, `#131212` carvão · `#212120` grafite · `#631F15`
  brasa · `#784920` caramelo queimado · `#D0BDA1` areia quente. Escuro, quente,
  intenso, noturno.
- **Sistema**, fundo osso `#F6EFE7` · acento tijolo `#A0361F`
- **Tom visual**: editorial cinematográfico. Tipografia display gigante com
  tracking negativo, corpo monoespaçado em caixa alta, muito respiro, foto com
  luz real. Referência estrutural: `disturbancebrands.com`.
- **Tipografia**: títulos Bebas Neue / Druk (paga, ver ADR-003);
  texto Space Grotesk; micro-labels em monoespaçada caixa alta.
- **Logo/símbolo**: dois wordmarks, `CASA` (letterspacing largo) e `HAUBERT`
  (condensado, pesado, com "STEAK & GRILLHOUSE" abaixo). Selo circular
  "CASA + HAUBERT". **Vetores ainda não entregues**, ver `memory/bugs.md`.

## Roadmap

- **Fase 0 (Fundação)** ← *estamos aqui*: governança, docs, design system, ADRs, plano de segurança
- **Fase 1 (Site institucional)**: home Dia/Noite, sobre, cultura, contato; reserva via WhatsApp; SEO local + schema.org
- **Fase 2 (Conteúdo vivo)**: cardápio e agenda vindos do Supabase; páginas de evento com OG image
- **Fase 3 (Painel da equipe)**: auth, CRUD de cardápio/agenda/fotos, reserva nativa com confirmação
- **Fase 4 (Produto)**: empacotar como template multi-tenant para outras casas, ver `docs/09_BACKLOG/`
