/**
 * Gera e confere os cabeçalhos de segurança do site público. (docs/11_SEGURANCA, Camada 4)
 *
 * O ESTADO QUE ISTO CORRIGE
 * A produção respondia com UM cabeçalho de segurança — o HSTS, que a Vercel põe
 * sozinha. Os outros quatro que o plano de segurança lista estavam ausentes.
 *
 * POR QUE O ARQUIVO É GERADO, E NÃO ESCRITO À MÃO
 * Uma CSP por hash é uma lista de impressões digitais do JavaScript embutido.
 * Mexer numa linha do script de tema muda o hash, e uma CSP desatualizada não
 * avisa: ela BLOQUEIA. O site subiria com a troca Dia/Noite morta e ninguém
 * saberia até um cliente reclamar.
 *
 * Então a política mora aqui, os hashes são MEDIDOS do build, e o `vercel.json`
 * é resultado. `--escrever` regrava; sem argumento, confere e derruba o build se
 * o commitado divergir do medido. Falhar no deploy é barulhento e barato;
 * publicar CSP errada é silencioso e caro.
 *
 * POR QUE NÃO O `security.csp` NATIVO DO ASTRO
 * Ele resolveria os hashes de script sozinho, mas também gera hash de ESTILO — e
 * o spec manda o browser ignorar `'unsafe-inline'` quando há hash. Os
 * `style="--proporcao:4 / 3"` e `style="--atraso:70ms"` do site são atributo, que
 * hash não cobre. Ligá-lo entregaria foto sem proporção e animação sem escada.
 * Conferido na fonte do pacote, não suposto.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SAIDA = 'vercel.json';
const PASTA = 'dist/client';

/**
 * `script-src` é o que importa de verdade: é ele que decide se um `<script>`
 * injetado roda. Fica em `'self'` + os hashes medidos, sem `'unsafe-inline'`.
 *
 * `style-src` fica com `'unsafe-inline'`, e isto é uma escolha, não um descuido.
 * O site usa atributo de estilo para três variáveis de dado — `--proporcao` (a
 * forma de cada foto), `--volta` (a velocidade da faixa) e `--atraso` (a escada
 * da animação). As duas primeiras vêm de dado e não viram classe sem um
 * catálogo fixo. CSS injetado sem script é um problema pequeno; a troca de dia
 * e noite quebrada é um problema que o cliente vê. Para fechar isto depois:
 * tirar os três atributos do markup — o que a diretriz de "separar CSS do
 * markup" já pede — e aí `style-src 'self'` passa a caber.
 */
const politicaPublica = (hashes) =>
  [
    "default-src 'self'",
    `script-src 'self' ${hashes.map((h) => `'sha256-${h}'`).join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // O site publicado não fala com o Supabase: o build baixa as fotos e serve
    // `/_astro/*.webp`. Quem fala é `/api/intencao`, que é a mesma origem.
    // (ADR-008)
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

/** Vale para tudo, inclusive painel e API. */
const CABECALHOS_GERAIS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nenhuma destas a casa usa. Negar é de graça e fecha a porta para o dia em
  // que uma dependência resolver pedir.
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'usb=()',
      'xr-spatial-tracking=()',
    ].join(', '),
  },
  // `frame-ancestors` já cobre isto nos browsers atuais; fica pelo resto.
  { key: 'X-Frame-Options', value: 'DENY' },
];

/**
 * Mede os hashes do JavaScript embutido no HTML gerado.
 *
 * `application/ld+json` fica de fora de propósito: é dado para o Google, não
 * script executável, e o browser não o submete a `script-src`. Isto foi
 * conferido no browser, com a CSP ligada, olhando se o `schema.org` sobrevivia.
 */
function medirHashes() {
  const arquivos = [];
  (function varrer(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) varrer(p);
      else if (item.name.endsWith('.html')) arquivos.push(p);
    }
  })(PASTA);

  const achados = new Map();
  for (const arquivo of arquivos) {
    const html = fs.readFileSync(arquivo, 'utf8');
    for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const [, atributos, corpo] = m;
      if (/\bsrc=/.test(atributos) || /ld\+json/.test(atributos)) continue;
      const hash = crypto.createHash('sha256').update(corpo, 'utf8').digest('base64');
      if (!achados.has(hash)) achados.set(hash, arquivo);
    }
  }
  return { hashes: [...achados.keys()].sort(), paginas: arquivos.length };
}

function montar(hashes) {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    headers: [
      { source: '/(.*)', headers: CABECALHOS_GERAIS },
      {
        // O painel fica de fora: ele é SSR com ilha React, e a hidratação gera
        // script embutido na hora do pedido, que build nenhum consegue medir. A
        // CSP dele é posta pelo `src/middleware.ts`, mais frouxa no script e
        // mais restrita no resto. Se as duas valessem para a mesma rota o
        // browser aplicaria a interseção e o painel morreria.
        source: '/((?!api/|painel).*)',
        headers: [{ key: 'Content-Security-Policy', value: politicaPublica(hashes) }],
      },
    ],
  };
}

function main() {
  const escrever = process.argv.includes('--escrever');

  if (!fs.existsSync(PASTA)) {
    console.error(`  ${PASTA} não existe. Rode o build antes.`);
    process.exit(1);
  }

  const { hashes, paginas } = medirHashes();

  // Uma conferência que passa sem medir nada é pior que conferência nenhuma:
  // ela dá a sensação de estar protegido. Se não achou HTML, ou não achou o
  // script de tema do ADR-004 que está em toda página, algo mudou de lugar.
  if (paginas === 0 || hashes.length === 0) {
    console.error(`  medi ${paginas} páginas e ${hashes.length} scripts embutidos.`);
    console.error('  isso não bate com um build real — o HTML mudou de lugar?');
    process.exit(1);
  }

  const novo = JSON.stringify(montar(hashes), null, 2) + '\n';

  if (escrever) {
    fs.writeFileSync(SAIDA, novo);
    console.log(`  ${SAIDA} gerado: ${hashes.length} hashes de ${paginas} páginas.`);
    return;
  }

  const atual = fs.existsSync(SAIDA) ? fs.readFileSync(SAIDA, 'utf8') : '';
  if (atual === novo) {
    console.log(`  CSP confere: ${hashes.length} hashes, ${paginas} páginas.`);
    return;
  }

  console.error('');
  console.error('  O JavaScript embutido mudou e o vercel.json ficou para trás.');
  console.error('  Publicar assim entrega o site com os scripts BLOQUEADOS pela CSP');
  console.error('  — a troca Dia/Noite para de funcionar em todas as páginas.');
  console.error('');
  console.error('  Conserto:  npm run csp -- --escrever   (e comite o vercel.json)');
  console.error('');
  process.exit(1);
}

main();
