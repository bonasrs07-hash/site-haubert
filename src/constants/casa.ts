/**
 * SEED DA CASA, o único lugar do código onde "HAUBERT" aparece como dado. (P-003)
 *
 * Toda a copy abaixo vem do guia SOCIAL DNA (ago/2025), transcrita das pranchas
 * originais em `brand/`. Nada aqui foi inventado pelo desenvolvedor. (P-006)
 *
 * Na Fase 2 este arquivo vira `supabase/seeds/001_casa_haubert.sql` e a leitura
 * passa a ser do banco. O shape é o mesmo de propósito.
 *
 * Campos marcados com PENDENTE aguardam o cliente, ver memory/bugs.md.
 */
import type { Casa, Corte, ElementoFogo, Evento, Marca, Pilar } from '@/lib/tipos';
import { PENDENTE } from '@/lib/tipos';

// ============================================================================
// AS DUAS MARCAS
// ============================================================================

export const MARCA_CASA: Marca = {
  slug: 'casa',
  nome: 'CASA Coffee Colab',
  nomeCurto: 'CASA',
  logotipo: 'Casa Coffee',
  descritor: 'Coffee Colab',
  mote: 'Luz. Leveza. Encontro.',
  modo: 'dia',
  instagram: '@casa.coffee',
  instagramUrl: 'https://instagram.com/casa.coffee',
  seguidores: '31,2 mil',
  // BLK-003: horário oficial pendente de confirmação do cliente.
  horario: [
    { dias: [1, 2, 3, 4, 5], abre: '08:00', fecha: '19:00' },
    { dias: [6, 0], abre: '09:00', fecha: '19:00' },
  ],
  horarioLegivel: `Seg a sex, 8h às 19h · Sáb e dom, 9h às 19h ${PENDENTE}`,
  copy: {
    manifesto: 'Mais café. Mais que churrasco. Mais que um lugar.',
    manifestoApoio: [
      'Somos ponto de encontro entre boas pessoas, boa comida, bom design e boas histórias.',
      'Do café da manhã ao último brinde da noite, conectamos duas culturas que se completam: leveza e encontro, fogo e celebração.',
      'Do dia à noite. Do simples ao memorável.',
    ],
    convite: 'Aqui, o tempo tem outro ritmo.',
    assinatura: 'O dia alimenta.',
  },
};

export const MARCA_HAUBERT: Marca = {
  slug: 'haubert',
  nome: 'HAUBERT Steak & Grillhouse',
  nomeCurto: 'HAUBERT',
  logotipo: 'Haubert',
  descritor: 'Steak & Grillhouse',
  mote: 'Fogo. Força. Tradição.',
  modo: 'noite',
  instagram: '@haubert.steakhouse',
  instagramUrl: 'https://instagram.com/haubert.steakhouse',
  seguidores: '10,8 mil',
  // Board 008 do guia: "A partir das 19h · qui – dom".
  horario: [{ dias: [4, 5, 6, 0], abre: '19:00', fecha: '00:00' }],
  horarioLegivel: `A partir das 19h · qui a dom ${PENDENTE}`,
  copy: {
    manifesto: 'Não é sobre queimar. É sobre dominar.',
    manifestoApoio: [
      'O fogo revela o que é feito com intenção.',
      'Aqui, o tempo é ingrediente. A técnica é o que constrói sabor.',
      'O fogo é o que transforma.',
    ],
    convite: 'Quando o dia desacelera, a casa muda de ritmo.',
    assinatura: 'A lenha transforma.',
  },
};

// ============================================================================
// A CASA (tenant)
// ============================================================================

export const CASA: Casa = {
  slug: 'casa-haubert',
  nome: 'CASA + HAUBERT',
  cidade: 'Novo Hamburgo',
  uf: 'RS',
  // BLK-003 e BLK-005: endereço, telefone e WhatsApp pendentes do cliente.
  endereco: PENDENTE,
  telefone: PENDENTE,
  whatsapp: import.meta.env.PUBLIC_WHATSAPP ?? '',
  marcas: [MARCA_CASA, MARCA_HAUBERT],
};

// ============================================================================
// CONTEÚDO INSTITUCIONAL, prancha 001 (SOCIAL MANIFESTO)
// ============================================================================

export const HEADLINE_MAE = 'Não venda o lugar. Faça as pessoas quererem pertencer.';

export const ESSENCIA = 'Uma essência. Dois conceitos. Uma conexão que fica.';

/**
 * O neon do salão diz "Support Your Local Everything.", e continua dizendo,
 * porque é objeto físico da casa e aparece assim na foto de /cultura. O que o
 * SITE fala é português: esta é a voz da casa, não a legenda do neon. (ADR-007)
 */
export const FRASE_LOCAL = 'Apoie tudo que é local.';

export const PILARES: Pilar[] = [
  { nome: 'Autenticidade', descricao: 'Verdade em tudo o que fazemos. Do produto ao atendimento.' },
  { nome: 'Conexão', descricao: 'Pessoas no centro. Histórias que se encontram aqui.' },
  { nome: 'Experiência', descricao: 'Do primeiro café ao último brinde. Cada detalhe importa.' },
  { nome: 'Design & Atmosfera', descricao: 'Luz, textura e aroma. Ambientes que acolhem.' },
  { nome: 'Hospitalidade', descricao: 'Receber bem é o nosso padrão. Fazer você se sentir em casa.' },
  { nome: 'Cultura', descricao: 'Música, arte, esporte, moda, e tudo que move a cidade.' },
];

/** Prancha 001, a faixa de seis eixos que define a casa. */
export const O_QUE_ENTREGAMOS: Pilar[] = [
  { nome: 'Café de verdade', descricao: 'Feito com técnica, tempo e propósito.' },
  { nome: 'Comida boa', descricao: 'Ingredientes reais. Sabor que fica.' },
  { nome: 'Música & cultura', descricao: 'Curadoria que conecta e transforma o ambiente.' },
  { nome: 'Bebidas', descricao: 'Clássicos e autorais. Do café ao coquetel.' },
  { nome: 'Fogo & tradição', descricao: 'Técnica, paciência e respeito ao produto.' },
  { nome: 'Pessoas & histórias', descricao: 'O que nos move são as conexões.' },
];

export const COMPROMISSO =
  'Criar uma comunidade real, onde bons momentos viram memórias e memórias viram parte de quem somos.';

// ============================================================================
// FOGO, prancha 003
// ============================================================================

export const ELEMENTOS_DO_FOGO: ElementoFogo[] = [
  {
    numero: '01',
    nome: 'Madeira',
    descricao: 'A escolha que define o aroma e o sabor. Cada lenha tem sua personalidade.',
  },
  {
    numero: '02',
    nome: 'Brasa',
    descricao: 'Constância e controle. A base de tudo. Calor vivo, estável e constante.',
  },
  {
    numero: '03',
    nome: 'Técnica',
    descricao: 'Domínio de temperatura, cortes e movimentos. Respeito ao tempo e ao processo.',
  },
  {
    numero: '04',
    nome: 'Fumaça',
    descricao: 'Aromas que marcam. Leve quando precisa, intensa quando pede. Equilíbrio é arte.',
  },
  {
    numero: '05',
    nome: 'Descanso',
    descricao: 'O tempo final. Sabor se acomoda, suculência se mantém. O detalhe que entrega.',
  },
];

export const FRASE_FOGO = 'O fogo não é o espetáculo. O fogo é a língua. E a gente fala.';

// ============================================================================
// CORTES, prancha 004. Sem preço na Fase 1 (BLK-004).
// ============================================================================

export const CORTES: Corte[] = [
  { nome: 'Ancho', descricao: 'Marmoreio equilibrado e sabor marcante. Suculento e versátil.' },
  { nome: 'Rib Eye', descricao: 'Macio, suculento e cheio de sabor. O favorito.' },
  { nome: 'T-Bone', descricao: 'Dois mundos em um só corte. Sabor e textura.' },
  { nome: 'Picanha', descricao: 'Sabor intenso e capa de gordura na medida certa.' },
  { nome: 'Filé Mignon', descricao: 'Macio e delicado. Minimalista e inesquecível.' },
  { nome: 'Brisket', descricao: 'Defumação lenta. Sabor profundo e textura única.' },
];

export const PROMESSA_STEAK =
  'Entregar verdade em cada detalhe. Do corte ao serviço, do fogo à mesa. Fazer do simples, algo memorável.';

// ============================================================================
// CULTURA E EVENTOS, pranchas 006 e 013
// ============================================================================

export const EVENTOS: Evento[] = [
  {
    slug: 'in-the-flow',
    titulo: 'In The Flow',
    descricao: 'Uma celebração de agora. Música, gente e boas vibrações.',
    cadencia: 'Mensal',
    marcaSlug: null,
  },
  {
    slug: 'resenha',
    titulo: 'Resenha',
    descricao: 'Encontro especial com o time. Som, drinks e conversão real.',
    cadencia: 'Quinzenal',
    marcaSlug: 'haubert',
  },
  {
    slug: 'bons-tempos',
    titulo: 'Bons Tempos',
    descricao: 'Clássicos que marcaram época. Boas lembranças, todos juntos.',
    cadencia: 'Mensal',
    marcaSlug: null,
  },
  {
    slug: 'matcha-club',
    titulo: 'Matcha Club',
    descricao: 'Ritual, bem-estar e música. Corpo, mente e comunidade.',
    cadencia: 'Semanal',
    marcaSlug: 'casa',
  },
];

export const EIXOS_CULTURA: Pilar[] = [
  { nome: 'Música que conecta', descricao: 'Do DJ à playlist, o som que cria atmosfera. Do vinil ao digital.' },
  { nome: 'Arte que transforma', descricao: 'Exposições, intervenções e colaborações que dão alma aos espaços.' },
  { nome: 'Cidade que inspira', descricao: 'Arquitetura, rua, pessoas e histórias que nos movem.' },
  { nome: 'Movimento que faz sentido', descricao: 'Fortalecemos a cena local. Gerando impacto.' },
];

export const FRASE_CULTURA = 'A cultura não é acessório. É essência.';

// ============================================================================
// A CASA À NOITE, prancha 008
// ============================================================================

export const NOITE_EXPERIENCIAS: Pilar[] = [
  { nome: 'Som que envolve', descricao: 'DJ sets que criam atmosfera e conexão.' },
  { nome: 'Brindes que celebram', descricao: 'Boa companhia, bons momentos.' },
  { nome: 'Sabores que impressionam', descricao: 'O fogo no ponto certo, com técnica e respeito.' },
  { nome: 'Encontros que ficam', descricao: 'Gente que compartilha o que importa.' },
];

export const FRASE_NOITE = 'Mesma casa. Nova atmosfera. Outra experiência.';

// ============================================================================
// FECHO, prancha 016 (CLOSING MANIFESTO)
// ============================================================================

export const FECHO = [
  'Cozinhamos com propósito.',
  'Servimos com verdade.',
  'Conectamos pessoas.',
  'Criamos memórias.',
  'Deixamos legado.',
];

export const RITMOS = [
  { de: 'O dia', faz: 'alimenta.' },
  { de: 'A lenha', faz: 'transforma.' },
  { de: 'A casa', faz: 'conecta.' },
  { de: 'A memória', faz: 'fica.' },
];
