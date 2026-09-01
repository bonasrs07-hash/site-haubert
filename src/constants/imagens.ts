/**
 * Acervo de imagens da marca.
 *
 * ORIGEM, todas as fotos deste arquivo são recortes das pranchas do guia
 * SOCIAL DNA (`brand/`). Aquele material é CONCEITO, não registro: as cenas
 * foram criadas para comunicar atmosfera numa apresentação e não fotografam a
 * casa real, a equipe real nem os pratos reais.
 *
 * A consequência prática está em cada `alt` daqui: nenhum deles afirma "este é
 * o nosso salão" ou "esta é a nossa equipe". Eles descrevem a cena, que é o
 * que a imagem de fato entrega. Quando o acervo do cliente chegar (BLK-002),
 * troca-se o import e o texto do `alt`, nenhuma seção do site precisa mudar.
 * O raciocínio inteiro está no ADR-007.
 *
 * RESOLUÇÃO, os recortes têm de 250 a 660 px de largura, que é o tamanho em
 * que a foto existe dentro da prancha. Isso basta para cartão e ladrilho e não
 * basta para fundo full-bleed, onde a imagem apareceria borrada. Por isso não
 * existe hero fotográfico neste site: é limitação de origem, não de estilo.
 */
import type { ImageMetadata } from 'astro';

import salaoDia from '@/assets/marca/salao-dia.webp';
import salaoNoite from '@/assets/marca/salao-noite.webp';
import cafeLatte from '@/assets/marca/cafe-latte.webp';
import pratoBrunch from '@/assets/marca/prato-brunch.webp';
import djCultura from '@/assets/marca/dj-cultura.webp';
import brindeTacas from '@/assets/marca/brinde-tacas.webp';
import carnesGrelha from '@/assets/marca/carnes-grelha.webp';
import fogoLenha from '@/assets/marca/fogo-lenha.webp';
import neonLocal from '@/assets/marca/neon-local.webp';
import timeAbraco from '@/assets/marca/time-abraco.webp';
import el1Madeira from '@/assets/marca/el-1-madeira.webp';
import el2Brasa from '@/assets/marca/el-2-brasa.webp';
import el3Tecnica from '@/assets/marca/el-3-tecnica.webp';
import el4Fumaca from '@/assets/marca/el-4-fumaca.webp';
import el5Descanso from '@/assets/marca/el-5-descanso.webp';

export interface Foto {
  src: ImageMetadata;
  /** Descreve a cena. Nunca afirma que a cena é a casa real. */
  alt: string;
}

// ============================================================================
// AS DUAS CULTURAS
// ============================================================================

export const FOTO_DIA: Foto = {
  src: salaoDia,
  alt: 'Salão de café com luz natural, mesas de madeira, balcão com máquina de espresso e plantas na janela.',
};

export const FOTO_NOITE: Foto = {
  src: salaoNoite,
  alt: 'Salão à noite, luz baixa e mesas cheias, com o fogo da parrilla aceso ao fundo.',
};

// ============================================================================
// OS CINCO ELEMENTOS DO FOGO, a ordem casa com ELEMENTOS_DO_FOGO
// ============================================================================

export const FOTOS_DO_FOGO: Foto[] = [
  { src: el1Madeira, alt: 'Lenha cortada, empilhada, mostrando a fibra da madeira.' },
  { src: el2Brasa, alt: 'Brasa viva sob carvão, com chama baixa e constante.' },
  { src: el3Tecnica, alt: 'Cortes de carne marcados sobre a grelha, com fumaça subindo.' },
  { src: el4Fumaca, alt: 'Fumaça branca desenhando no escuro.' },
  { src: el5Descanso, alt: 'Faca fatiando uma peça de carne já descansada.' },
];

// ============================================================================
// ATMOSFERA, a tira da home
// ============================================================================

export const TIRA_ATMOSFERA: Foto[] = [
  { src: cafeLatte, alt: 'Xícara de cappuccino com desenho na espuma, sobre pires de madeira.' },
  { src: pratoBrunch, alt: 'Prato de brunch com ovo, creme de abacate e pão tostado.' },
  { src: djCultura, alt: 'DJ tocando em pickups dentro de um salão, à luz de lâmpadas quentes.' },
  { src: carnesGrelha, alt: 'Peças de carne assando enfileiradas sobre a grelha.' },
  { src: brindeTacas, alt: 'Duas taças erguidas em brinde sobre a mesa.' },
  { src: fogoLenha, alt: 'Lenha em chamas altas dentro de uma fornalha.' },
];

// ============================================================================
// AVULSAS
// ============================================================================

export const FOTO_NEON: Foto = {
  src: neonLocal,
  // O neon é objeto físico e fala inglês. O alt diz o que está escrito nele,
  // quem usa leitor de tela tem direito à mesma informação de quem enxerga.
  alt: 'Letreiro de neon laranja numa parede escura, escrito "Support Your Local Everything".',
};

export const FOTO_TIME: Foto = {
  src: timeAbraco,
  alt: 'Grupo de pessoas de costas, abraçadas, com camisetas escuras da casa.',
};
