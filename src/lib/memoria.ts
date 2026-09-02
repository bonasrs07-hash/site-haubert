/**
 * O que já aconteceu na casa, agrupado por formato. (`/memoria`)
 *
 * O BURACO QUE ISTO TAPA
 * `/agenda` mostra só o que vem, de propósito: agenda com data velha é agenda
 * errada. E `/evento/[slug]` continua no ar depois da noite passar, para link
 * compartilhado não morrer na segunda. Só que ninguém CHEGA nessas páginas: não
 * existia índice do que já rolou. A história da casa estava publicada e
 * inalcançável.
 *
 * POR QUE AGRUPAR POR FORMATO, E NÃO POR ANO
 * A casa não faz "eventos", ela faz quatro encontros com nome: In The Flow,
 * Resenha, Bons Tempos, Matcha Club (`constants/casa.ts`, pranchas 006 e 013).
 * Quem chega quer ver "como é o Resenha", não "o que rolou em 2026". Uma
 * prateleira por formato, com as edições dentro, responde a pergunta que a
 * pessoa realmente tem, e é o que dá sentido a um carrossel: coisa parecida,
 * lado a lado, em sequência.
 *
 * O CASAMENTO É PELO TÍTULO, e isso é escolha, não preguiça. A alternativa era
 * uma coluna `serie` em `events`, mais um campo no painel, mais uma migration,
 * para um dado que o dono já digita no nome ("Resenha #12"). Menos peça para o
 * dono operar errado. Evento que não casa com formato nenhum não some: cai em
 * "Outras noites", que é o comportamento seguro.
 */
import type { EventoDatado } from './agenda';

export interface FormatoConhecido {
  slug: string;
  titulo: string;
  descricao: string;
  cadencia: string;
}

export interface GrupoDeMemoria {
  /** Serve de `id` de âncora e de `key`. */
  chave: string;
  titulo: string;
  descricao: string | null;
  /** Da edição mais recente para a mais antiga. */
  edicoes: EventoDatado[];
}

/** Sem acento, sem caixa, sem espaço dobrado. Para comparar título com título. */
function achatar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * O evento já passou?
 *
 * Usa o FIM quando ele existe, com seis horas de tolerância, o mesmo critério
 * que o painel usa para decidir o que ainda é "por vir". Sem a tolerância, uma
 * festa que varou a madrugada apareceria como memória enquanto as pessoas ainda
 * estão nela, o que é um jeito bobo de mentir.
 */
export function jaPassou(evento: EventoDatado, agora: Date = new Date()): boolean {
  const fim = new Date(evento.fimEm ?? evento.inicioEm).getTime();
  return fim < agora.getTime() - 6 * 3600 * 1000;
}

/** Só o que já aconteceu, do mais recente para o mais antigo. */
export function jaAconteceram(
  eventos: EventoDatado[],
  agora: Date = new Date(),
): EventoDatado[] {
  return eventos
    .filter((e) => jaPassou(e, agora))
    .sort((a, b) => new Date(b.inicioEm).getTime() - new Date(a.inicioEm).getTime());
}

/**
 * Distribui as edições nas prateleiras.
 *
 * A ordem dos formatos é a de `constants/casa.ts`, que é decisão editorial, não
 * alfabética. Formato sem nenhuma edição registrada não vira prateleira vazia:
 * ele simplesmente não aparece, porque prateleira vazia não conta história,
 * conta que falta cadastro.
 */
export function agruparPorFormato(
  passados: EventoDatado[],
  formatos: FormatoConhecido[],
): GrupoDeMemoria[] {
  const restantes = [...passados];
  const grupos: GrupoDeMemoria[] = [];

  for (const formato of formatos) {
    const alvo = achatar(formato.titulo);
    const dele: EventoDatado[] = [];

    for (let i = restantes.length - 1; i >= 0; i--) {
      if (achatar(restantes[i].titulo).startsWith(alvo)) {
        dele.unshift(restantes[i]);
        restantes.splice(i, 1);
      }
    }

    if (dele.length) {
      grupos.push({
        chave: formato.slug,
        titulo: formato.titulo,
        descricao: formato.descricao,
        edicoes: dele,
      });
    }
  }

  // O que não casou com formato nenhum. Vai por último porque é o resto, e
  // ainda assim vai, porque noite que aconteceu merece ficar registrada.
  if (restantes.length) {
    grupos.push({
      chave: 'outras',
      titulo: 'Outras noites',
      descricao: 'Encontros que não se repetem, e nem por isso valeram menos.',
      edicoes: restantes,
    });
  }

  return grupos;
}

/** Quantas edições ao todo. É o número que a página usa para se apresentar. */
export function contarEdicoes(grupos: GrupoDeMemoria[]): number {
  return grupos.reduce((total, g) => total + g.edicoes.length, 0);
}
