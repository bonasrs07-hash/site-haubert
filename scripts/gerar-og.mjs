/**
 * Gera a imagem de compartilhamento de cada página, e o favicon.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 * As oito rotas públicas usavam o MESMO `og.jpg`. Num negócio cuja
 * distribuição inteira é Instagram e WhatsApp, todo link compartilhado
 * mostrava o mesmo cartão genérico: o cardápio, um evento de sábado e a página
 * da noite, idênticos. O cartão é a vitrine — é o que a pessoa vê antes de
 * decidir se toca.
 *
 * POR QUE satori, E NÃO SÓ O sharp QUE JÁ ESTAVA AQUI
 * Testei o caminho sem dependência nova: SVG com `@font-face` embutido,
 * rasterizado pelo sharp. Ele ignora a fonte e cai numa serifa do sistema —
 * conferido olhando o PNG. Como o ponto inteiro é a tipografia da marca, isso
 * não serve. O satori roda só no build e não põe um byte no cliente.
 *
 * FALHA SEM DRAMA
 * Se qualquer coisa aqui quebrar (satori, banco, fonte), o script avisa e sai
 * com sucesso, e o `og.json` fica sem a chave. Quem lê no `Base.astro` cai no
 * `og.jpg` de sempre. Cartão antigo é problema pequeno; build que não passa
 * por causa de imagem social é o fim do dia. (F-006)
 */
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const SAIDA_IMG = 'public/og';
const SAIDA_MANIFESTO = 'src/generated/og.json';
const LARGURA = 1200;
const ALTURA = 630;

/** Os tokens da marca, copiados de `tokens.css`. */
const COR = {
  dia: { fundo: '#f6efe7', texto: '#131212', suave: '#555123', acento: '#a0361f' },
  noite: { fundo: '#131212', texto: '#f6efe7', suave: '#a3937d', acento: '#d9553a' },
};

function lerEnv() {
  if (!fs.existsSync('.env')) return {};
  return Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
}
const env = { ...lerEnv(), ...process.env };

function fonte(pacote, arquivo) {
  const p = path.join('node_modules/@fontsource', pacote, 'files', arquivo);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

/**
 * As rotas fixas. É catálogo, não varredura: o texto do cartão é decisão
 * editorial, e deixar uma máquina adivinhar a partir do `<title>` daria
 * "Cardápio · CASA + HAUBERT" repetido em tudo.
 */
const ROTAS = [
  { chave: 'home', olho: 'Novo Hamburgo · RS', titulo: 'Mais que café. Mais que churrasco.', modo: 'dia' },
  { chave: 'cardapio', olho: 'O que sai da cozinha', titulo: 'Cardápio', modo: 'noite' },
  { chave: 'agenda', olho: 'O que vem por aí', titulo: 'Agenda', modo: 'noite' },
  { chave: 'sobre', olho: 'Quem somos', titulo: 'Uma essência. Dois conceitos.', modo: 'dia' },
  { chave: 'fogo', olho: 'O método', titulo: 'O fogo é o que transforma', modo: 'noite' },
  { chave: 'cultura', olho: 'Programação', titulo: 'A cultura não é acessório', modo: 'dia' },
  { chave: 'contato', olho: 'Onde a casa fica', titulo: 'Contato e reservas', modo: 'dia' },
  { chave: 'noite', olho: 'A partir das 19h', titulo: 'Fogo. Força. Tradição.', modo: 'noite' },
];

/** Os eventos publicados, para cada um ter o seu cartão com nome e data. */
async function buscarEventos() {
  const url = env.PUBLIC_SUPABASE_URL;
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  const slug = env.PUBLIC_VENUE_SLUG;
  if (!url || !chave || !slug) return [];
  try {
    const casa = await fetch(`${url}/rest/v1/venues?slug=eq.${slug}&select=id`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    }).then((r) => r.json());
    if (!casa?.[0]) return [];

    const eventos = await fetch(
      `${url}/rest/v1/events?venue_id=eq.${casa[0].id}&publicado=eq.true&select=slug,titulo,inicio_em`,
      { headers: { apikey: chave, Authorization: `Bearer ${chave}` } },
    ).then((r) => r.json());

    const quando = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    return (Array.isArray(eventos) ? eventos : []).map((e) => ({
      chave: 'evento-' + e.slug,
      olho: quando.format(new Date(e.inicio_em)),
      titulo: e.titulo,
      modo: 'noite',
    }));
  } catch {
    return [];
  }
}

/** O cartão. Uma faixa de acento embaixo, para o card ter a cara da casa. */
function cartao({ olho, titulo, modo }) {
  const c = COR[modo] ?? COR.dia;
  return {
    type: 'div',
    props: {
      style: {
        width: LARGURA,
        height: ALTURA,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: c.fundo,
        padding: '72px 80px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontFamily: 'Mono', fontSize: 24, letterSpacing: 4, color: c.suave, textTransform: 'uppercase' },
            children: olho,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Display',
              fontSize: titulo.length > 34 ? 76 : 104,
              lineHeight: 1,
              color: c.texto,
              textTransform: 'uppercase',
              maxWidth: 1000,
            },
            children: titulo,
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: 20 },
            children: [
              { type: 'div', props: { style: { width: 64, height: 5, backgroundColor: c.acento }, children: '' } },
              {
                type: 'div',
                props: {
                  style: { fontFamily: 'Titulo', fontSize: 34, letterSpacing: 1, color: c.texto },
                  children: 'Casa Coffee + Haubert',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function principal() {
  const fontes = [
    { name: 'Display', data: fonte('anton', 'anton-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Titulo', data: fonte('bebas-neue', 'bebas-neue-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Mono', data: fonte('space-mono', 'space-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
  ].filter((f) => f.data);

  fs.mkdirSync(SAIDA_IMG, { recursive: true });
  fs.mkdirSync(path.dirname(SAIDA_MANIFESTO), { recursive: true });

  if (fontes.length < 3) {
    console.warn('  fontes não encontradas; mantendo o og.jpg de sempre.');
    fs.writeFileSync(SAIDA_MANIFESTO, JSON.stringify({ chaves: [] }, null, 2) + '\n');
    return;
  }

  const itens = [...ROTAS, ...(await buscarEventos())];
  const feitas = [];

  for (const item of itens) {
    try {
      const svg = await satori(cartao(item), { width: LARGURA, height: ALTURA, fonts: fontes });
      const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
      fs.writeFileSync(path.join(SAIDA_IMG, item.chave + '.png'), png);
      feitas.push(item.chave);
    } catch (erro) {
      console.warn('  falhou em ' + item.chave + ': ' + erro.message);
    }
  }

  // O favicon sai do mesmo lugar, com a mesma paleta: o "+" da assinatura
  // sobre a superfície da marca. Tipográfico por token, como o og.jpg já era —
  // não depende do BLK-001 (logo vetorial).
  try {
    const marca = {
      type: 'div',
      props: {
        style: {
          width: 256,
          height: 256,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COR.noite.fundo,
          color: COR.noite.acento,
          fontFamily: 'Display',
          fontSize: 190,
        },
        children: '+',
      },
    };
    const svg = await satori(marca, { width: 256, height: 256, fonts: fontes });
    const base = sharp(Buffer.from(svg));
    fs.writeFileSync('public/apple-touch-icon.png', await base.clone().resize(180, 180).png().toBuffer());
    fs.writeFileSync('public/icone-512.png', await base.clone().resize(512, 512).png().toBuffer());
    // .ico com 32px: é o que o browser pede em /favicon.ico sem <link>.
    fs.writeFileSync('public/favicon.ico', await base.clone().resize(32, 32).png().toBuffer());
    feitas.push('favicon');
  } catch (erro) {
    console.warn('  favicon falhou: ' + erro.message);
  }

  fs.writeFileSync(SAIDA_MANIFESTO, JSON.stringify({ chaves: feitas }, null, 2) + '\n');
  console.log('  cartões gerados: ' + feitas.filter((c) => c !== 'favicon').length + ' (+favicon)');
}

principal().catch((erro) => {
  // Nunca derruba o build. Ver o comentário do topo.
  console.warn('  gerador de OG falhou inteiro: ' + erro.message);
  fs.mkdirSync(path.dirname(SAIDA_MANIFESTO), { recursive: true });
  fs.writeFileSync(SAIDA_MANIFESTO, JSON.stringify({ chaves: [] }, null, 2) + '\n');
});
