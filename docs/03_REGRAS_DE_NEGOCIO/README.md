# 03 — Regras de Negócio

> Uma seção por módulo. Regra escrita **antes** de codar a feature.
> Regra que só existe no código é regra perdida.

## Módulo: Modo Dia/Noite

| # | Regra | Origem |
|---|---|---|
| RN-01 | A casa opera em dois modos: **Dia (CASA)** e **Noite (HAUBERT)** | `brand/` — "After 7, CASA é HAUBERT" |
| RN-02 | O corte é **19h**. A partir das 19h e até as 5h, o padrão é Noite | Guia SOCIAL DNA, prancha 008 |
| RN-03 | A hora define o **padrão**, nunca restringe. O visitante pode alternar a qualquer momento | Princípio nº1 |
| RN-04 | A escolha manual do visitante **sobrepõe a hora** e persiste entre visitas | Princípio nº1 |
| RN-05 | O modo ativo determina qual marca é pré-selecionada na reserva | F-001 |
| RN-06 | Adicionar uma terceira marca não exige código — só linha em `brands` | ADR-002 |

## Módulo: Cardápio

| # | Regra |
|---|---|
| RN-10 | Item só aparece publicamente se `publicado = true` **e** sua seção também estiver publicada |
| RN-11 | Cardápio é **por marca**: cortes pertencem ao HAUBERT, cafés à CASA |
| RN-12 | Preço nulo significa "não divulgado" — o campo some, não renderiza vazio |
| RN-13 | Preço é sempre `integer` em centavos. Exibição formatada em BRL na apresentação |
| RN-14 | Ordenação segue `ordem`; empate desempata por `nome` |
| RN-15 | Item sem foto usa um bloco tipográfico da marca, nunca placeholder cinza genérico |

## Módulo: Agenda

| # | Regra |
|---|---|
| RN-20 | Evento aparece na agenda pública se `publicado = true` e `inicio_em >= agora` |
| RN-21 | Evento **sem** `brand_id` é da casa e aparece nos dois modos |
| RN-22 | Evento com `brand_id` aparece prioritariamente no modo daquela marca |
| RN-23 | Evento passado sai da agenda mas sua página `/evento/[slug]` continua acessível (link compartilhado não pode morrer) |
| RN-24 | `fim_em`, quando existir, tem que ser maior que `inicio_em` (garantido por constraint) |

## Módulo: Reserva

| # | Regra | Fase |
|---|---|---|
| RN-30 | Reservar custa **no máximo 3 toques** a partir de qualquer tela | 1 |
| RN-31 | O CTA de reserva é persistente e visível em todas as telas | 1 |
| RN-32 | Fase 1: a reserva termina no WhatsApp; o site **não armazena** dado pessoal | 1 (ADR-005) |
| RN-33 | A mensagem pré-preenchida usa o nome da marca do modo ativo e o tom dela | 1 |
| RN-34 | Grupo entre 1 e 30 pessoas. Acima disso, o fluxo direciona para contato de eventos | 1 |
| RN-35 | Fase 3: reserva nasce `pendente`. Só a equipe confirma. O site nunca confirma sozinho | 3 |
| RN-36 | Fase 3: reserva é anonimizada 12 meses após a data (LGPD) | 3 |
| RN-37 | Sem WhatsApp configurado, o fluxo degrada para telefone — nunca para botão morto | 1 |

## Módulo: Horário de funcionamento

| # | Regra |
|---|---|
| RN-40 | Horário vive em `brands.horario` (JSONB por dia da semana), nunca em código |
| RN-41 | "Aberto agora" é calculado no fuso da casa (America/Sao_Paulo), não no fuso do visitante |
| RN-42 | Faixa que cruza a meia-noite (ex.: 19h–01h) conta para o dia em que começou |
| RN-43 | Horário ausente ou inválido exibe "consulte pelo WhatsApp" — nunca "fechado" por engano |

## Módulo: Conteúdo e marca

| # | Regra |
|---|---|
| RN-50 | Frase institucional nova tem que existir em `brand/` ou ser aprovada pelo dono da marca *(P-006)* |
| RN-51 | Foto de banco de imagem é proibida. Só acervo da casa |
| RN-52 | Foto com rosto identificável exige autorização registrada (BLK-008) |
| RN-53 | Qualquer peça que mostre bebida alcoólica leva aviso de consumo responsável e +18 |
| RN-54 | Escassez comunicada tem que ser real. Contador falso e "restam N lugares" inventado são proibidos |

## Módulo: Painel da equipe (Fase 3)

| # | Regra |
|---|---|
| RN-60 | Só membro da casa (`venue_members`) acessa o painel daquela casa |
| RN-61 | Papel `editor` publica conteúdo; papel `dono` também gerencia membros |
| RN-62 | Toda ação destrutiva pede confirmação explícita |
| RN-63 | Publicar/despublicar é reversível em um toque |
| RN-64 | A verificação de sessão acontece **no servidor**, antes de emitir o HTML |

## Invariantes do sistema

Coisas que precisam ser verdade sempre, em qualquer fase:

1. Nenhum dado de uma casa é visível para membro de outra casa
2. Nenhum conteúdo não publicado aparece publicamente
3. Nenhuma cor de marca está escrita em componente
4. Nenhuma frase institucional foi inventada pelo desenvolvedor
5. O CTA de reserva funciona — mesmo com JS desligado, mesmo com o banco fora do ar
