/**
 * Orçamento de JavaScript por página. (memory/restrictions.md, ADR-006/008)
 *
 * A restrição diz "< 60kb de JS na home" e o ADR-006 promete zero React nas
 * páginas públicas. Depois que o painel entrou, o React passou a existir no
 * projeto — e a única forma de a promessa continuar valendo é MEDIR, não
 * confiar.
 *
 * O que se mede é o que a página realmente MANDA o browser baixar: os
 * `<script src>` do HTML e o que eles importam em cascata. Somar a pasta
 * `_astro/` inteira não serve — lá dentro existe chunk que nenhuma página
 * pública referencia.
 *
 * Uso: npm run orcamento:js
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Onde o build deixou o site. Assim que uma rota SSR entrou no projeto (o
 * painel), o Astro passou a separar `dist/client` de `dist/server` — e a
 * primeira versão deste script continuou apontando para `dist`, medindo zero
 * byte e PASSANDO. Orçamento que passa medindo nada é pior que orçamento
 * nenhum, porque cria confiança falsa. Daí a checagem de sanidade no fim.
 */
const DIST = fs.existsSync('dist/client') ? 'dist/client' : 'dist';

/** Teto por página, em bytes. O do painel é generoso: ele é uma ilha React. */
const TETOS = {
  publico: 60 * 1024,
  painel: 400 * 1024,
};

function listarHtml(dir) {
  const achados = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...listarHtml(completo));
    else if (entrada.name.endsWith('.html')) achados.push(completo);
  }
  return achados;
}

const tamanhoDe = (arquivo) => {
  try {
    return fs.statSync(arquivo).size;
  } catch {
    return 0;
  }
};

/** Segue os `import`/`from` de um módulo para dentro, sem contar duas vezes. */
function fecharDependencias(entrada, vistos) {
  if (vistos.has(entrada)) return;
  vistos.add(entrada);
  let codigo = '';
  try {
    codigo = fs.readFileSync(entrada, 'utf8');
  } catch {
    return;
  }
  for (const m of codigo.matchAll(/from\s*["'](\.[^"']+)["']|import\s*\(\s*["'](\.[^"']+)["']/g)) {
    const rel = m[1] ?? m[2];
    if (!rel) continue;
    fecharDependencias(path.resolve(path.dirname(entrada), rel), vistos);
  }
}

const paginas = listarHtml(DIST).sort();
let reprovou = false;
const linhas = [];

for (const pagina of paginas) {
  const html = fs.readFileSync(pagina, 'utf8');
  const vistos = new Set();

  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    const src = m[1];
    if (!src.startsWith('/')) continue;
    fecharDependencias(path.resolve(DIST, '.' + src), vistos);
  }

  const bytes = [...vistos].reduce((soma, f) => soma + tamanhoDe(f), 0);
  const rota = '/' + path.relative(DIST, pagina).replace(/\\/g, '/').replace(/index\.html$/, '');
  const ehPainel = rota.startsWith('/painel');
  const teto = ehPainel ? TETOS.painel : TETOS.publico;
  const passou = bytes <= teto;
  if (!passou) reprovou = true;

  linhas.push(
    `${passou ? 'ok  ' : 'ESTOUROU'} ${rota.padEnd(24)} ${String(bytes).padStart(7)} B  ` +
      `(teto ${teto} B, ${vistos.size} módulo${vistos.size === 1 ? '' : 's'})`,
  );
}

console.log(linhas.join('\n'));

// Nenhuma página deste site tem zero byte de JS: o alternador Dia/Noite, a
// barra de reserva e a folha de reserva são script em toda página. Zero em
// TODAS significa que o script não achou os arquivos — não que o site
// emagreceu. Sem esta checagem, um erro de caminho vira aprovação silenciosa.
const semNada = linhas.filter((l) => /\s0 B\s/.test(l)).length;
if (linhas.length > 0 && semNada === linhas.length) {
  console.error('\nMedição inválida: nenhum JS encontrado em nenhuma página.');
  console.error(`Confira se "${DIST}" é mesmo a raiz do site publicado.`);
  process.exit(1);
}

if (reprovou) {
  console.error('\nOrçamento de JS estourado. Ilha nova em página pública exige ADR.');
  process.exit(1);
}
console.log('\nOrçamento de JS respeitado em todas as páginas.');
