/**
 * As VAGAS de foto do site — o catálogo que o painel edita. (ADR-008)
 *
 * Uma vaga é uma POSIÇÃO ("a foto grande do cartão do dia"), não um arquivo.
 * O arquivo que ocupa a posição hoje pode mudar amanhã sem que nenhuma seção
 * do site saiba — que é a mesma promessa que o ADR-007 já fazia, agora sem
 * precisar de deploy manual.
 *
 * `padrao` é o piso: o arquivo versionado em `src/assets/marca/`. Vaga sem foto
 * no banco, Supabase fora do ar ou `.env` em branco caem aqui, e o site compila
 * do mesmo jeito. Site com foto antiga é melhor que site que não sobe. (F-006)
 *
 * O catálogo é DADO, não código espalhado: casa nova tem outras vagas, e é aqui
 * que elas são declaradas. O banco guarda só a chave, em texto — ele não pode
 * saber o layout de ninguém. (ADR-002)
 */
import type { Foto } from './imagens';
import { FOTOS_DO_FOGO, FOTO_DIA, FOTO_NEON, FOTO_NOITE, FOTO_TIME, TIRA_ATMOSFERA } from './imagens';

export type ChaveVaga =
  | 'foto-dia'
  | 'foto-noite'
  | 'fogo-1'
  | 'fogo-2'
  | 'fogo-3'
  | 'fogo-4'
  | 'fogo-5'
  | 'tira-1'
  | 'tira-2'
  | 'tira-3'
  | 'tira-4'
  | 'tira-5'
  | 'tira-6'
  | 'neon'
  | 'time';

export interface Vaga {
  chave: ChaveVaga;
  /** Como a vaga se chama para o dono. Ele não sabe o que é "tira-3". */
  rotulo: string;
  /** Onde ela aparece, para o dono conseguir se localizar no site. */
  onde: string;
  /** Proporção da moldura no site — a pré-visualização do painel usa a mesma. */
  proporcao: string;
  padrao: Foto;
}

/** Agrupa as vagas no painel na mesma ordem em que aparecem no site. */
export interface GrupoDeVagas {
  titulo: string;
  descricao: string;
  vagas: Vaga[];
}

export const GRUPOS_DE_VAGAS: GrupoDeVagas[] = [
  {
    titulo: 'As duas culturas',
    descricao: 'Os dois cartões da home e da página "A casa".',
    vagas: [
      {
        chave: 'foto-dia',
        rotulo: 'Cartão do dia — CASA',
        onde: 'Home e /sobre, no cartão da CASA Coffee',
        proporcao: '16 / 11',
        padrao: FOTO_DIA,
      },
      {
        chave: 'foto-noite',
        rotulo: 'Cartão da noite — HAUBERT',
        onde: 'Home e /sobre, no cartão do HAUBERT',
        proporcao: '16 / 11',
        padrao: FOTO_NOITE,
      },
    ],
  },
  {
    titulo: 'Os cinco elementos do fogo',
    descricao: 'A sequência do método, na home, em /fogo e em /noite. A ordem é a mensagem.',
    vagas: FOTOS_DO_FOGO.map((padrao, i) => ({
      chave: `fogo-${i + 1}` as ChaveVaga,
      rotulo: ['Madeira', 'Brasa', 'Técnica', 'Fumaça', 'Descanso'][i],
      onde: `Elemento ${i + 1} de 5`,
      proporcao: '4 / 3',
      padrao,
    })),
  },
  {
    titulo: 'A tira de atmosfera',
    descricao: 'As seis cenas da home, na ordem do dia: do primeiro café ao último brinde.',
    vagas: TIRA_ATMOSFERA.map((padrao, i) => ({
      chave: `tira-${i + 1}` as ChaveVaga,
      rotulo: ['Café', 'Prato', 'Música', 'Brasa', 'Brinde', 'Fogo'][i],
      onde: `Cena ${i + 1} de 6`,
      proporcao: '3 / 4',
      padrao,
    })),
  },
  {
    titulo: 'Avulsas',
    descricao: 'As duas fotos grandes das páginas internas.',
    vagas: [
      {
        chave: 'neon',
        rotulo: 'O neon do salão',
        onde: '/cultura, na faixa de foto',
        proporcao: '4 / 3',
        padrao: FOTO_NEON,
      },
      {
        chave: 'time',
        rotulo: 'A equipe',
        onde: '/sobre, na faixa larga',
        proporcao: '21 / 5',
        padrao: FOTO_TIME,
      },
    ],
  },
];

export const VAGAS: Vaga[] = GRUPOS_DE_VAGAS.flatMap((g) => g.vagas);

export function buscarVaga(chave: string): Vaga | undefined {
  return VAGAS.find((v) => v.chave === chave);
}

/** A chave existe no catálogo? Entrada do painel é entrada a ser validada. */
export function ehChaveDeVaga(valor: unknown): valor is ChaveVaga {
  return typeof valor === 'string' && VAGAS.some((v) => v.chave === valor);
}
