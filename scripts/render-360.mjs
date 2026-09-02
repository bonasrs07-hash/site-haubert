/**
 * Gera o PLACEHOLDER do giro 360 de `/360`, e a trilha do prato junto.
 *
 * O video e ficticio de proposito: existe para a mecanica poder ser vista
 * andando antes de existir footage. A camera desce por uma coluna e para em
 * seis estacoes, uma por corte; em cada uma o chef da uma volta mostrando o
 * prato, e a camera segue descendo.
 *
 * Sai RGB cru no stdout, para o ffmpeg encodar, e escreve a TRILHA DO PRATO no
 * caminho passado como argumento. A trilha guarda [x, y, visibilidade] por
 * quadro, em porcentagem do quadro, e e o que faz o botao da pagina pousar em
 * cima do prato: com a camera descendo ele nao fica mais numa altura fixa.
 * Refazer essa conta na pagina seria manter a mesma matematica em dois
 * lugares, que e como os dois divergem.
 *
 * Uso:  npm run video:360
 *
 * Quando existir o video de verdade, este arquivo sai de cena: o que fica e o
 * FORMATO da trilha, que o footage real precisa alimentar depois de rastrear
 * o prato. E o contrato que o video precisa cumprir continua o mesmo: uma
 * volta por corte, velocidade constante, de costas na metade.
 */
import fs from 'node:fs';

const L = 640;
const A = 854;
const CORTES = 6;
const QUADROS_POR_CORTE = 72;
const TOTAL = CORTES * QUADROS_POR_CORTE;

/** Fracao do trecho parada na estacao. O resto e viagem para a proxima. */
const PARADA = 0.56;
const PASSO = 1000;            // distancia entre estacoes, em px de mundo
const TOPO_NA_PARADA = 0.13 * A;
const FASE_DA_MAO = -0.62;

const CARVAO = [19, 18, 18];
const BRASA = [99, 31, 21];
const TIJOLO = [217, 85, 58];
const AREIA = [208, 189, 161];
const CARAMELO = [120, 73, 32];

const mistura = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// ---------------------------------------------------------------- utilidades

const novaTela = (l, a) => ({ l, a, px: new Float32Array(l * a * 3) });

function pinta(t, x, y, cor, alfa) {
  if (alfa <= 0) return;
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= t.l || y >= t.a) return;
  const i = (y * t.l + x) * 3;
  const k = alfa > 1 ? 1 : alfa;
  t.px[i] += (cor[0] - t.px[i]) * k;
  t.px[i + 1] += (cor[1] - t.px[i + 1]) * k;
  t.px[i + 2] += (cor[2] - t.px[i + 2]) * k;
}

function disco(t, cx, cy, r, cor, alfa = 1) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(t.l - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(t.a - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const a = Math.min(1, Math.max(0, r - d + 0.5));
      if (a > 0) pinta(t, x, y, cor, a * alfa);
    }
  }
}

function elipse(t, cx, cy, rx, ry, cor, alfa = 1) {
  const x0 = Math.max(0, Math.floor(cx - rx - 1));
  const x1 = Math.min(t.l - 1, Math.ceil(cx + rx + 1));
  const y0 = Math.max(0, Math.floor(cy - ry - 1));
  const y1 = Math.min(t.a - 1, Math.ceil(cy + ry + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      const a = Math.min(1, Math.max(0, (1 - d) * Math.min(rx, ry) + 0.5));
      if (a > 0) pinta(t, x, y, cor, a * alfa);
    }
  }
}

/**
 * Brilho: queda suave ao longo do raio INTEIRO.
 *
 * `elipse` tem rampa de um pixel, que e o certo para forma solida e o errado
 * para luz: usada como brilho ela desenha uma bolha de borda dura, que foi
 * exatamente o que apareceu na primeira medicao.
 */
function halo(t, cx, cy, rx, ry, cor, alfa = 1, expoente = 2) {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(t.l - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(t.a - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      if (d >= 1) continue;
      pinta(t, x, y, cor, (1 - d) ** expoente * alfa);
    }
  }
}

function capsula(t, x1, y1, x2, y2, r, cor, alfa = 1) {
  const minx = Math.max(0, Math.floor(Math.min(x1, x2) - r - 1));
  const maxx = Math.min(t.l - 1, Math.ceil(Math.max(x1, x2) + r + 1));
  const miny = Math.max(0, Math.floor(Math.min(y1, y2) - r - 1));
  const maxy = Math.min(t.a - 1, Math.ceil(Math.max(y1, y2) + r + 1));
  const vx = x2 - x1;
  const vy = y2 - y1;
  const ll = vx * vx + vy * vy || 1;
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5 - x1;
      const py = y + 0.5 - y1;
      let s = (px * vx + py * vy) / ll;
      s = s < 0 ? 0 : s > 1 ? 1 : s;
      const d = Math.hypot(px - vx * s, py - vy * s);
      const a = Math.min(1, Math.max(0, r - d + 0.5));
      if (a > 0) pinta(t, x, y, cor, a * alfa);
    }
  }
}

// -------------------------------------------------------------- a figura fixa

const FL = 400;
const FA = 520;
const ESCALA = 0.86;
const FIG_L = FL * ESCALA;
const FIG_A = FA * ESCALA;

function desenharFigura(comRosto) {
  const t = novaTela(FL, FA);
  const cob = new Float32Array(FL * FA);
  const marcar = (fn) => {
    const antes = t.px.slice();
    fn();
    for (let i = 0; i < cob.length; i++) {
      const j = i * 3;
      if (t.px[j] !== antes[j] || t.px[j + 1] !== antes[j + 1] || t.px[j + 2] !== antes[j + 2]) {
        cob[i] = 1;
      }
    }
  };
  const CORPO = [16, 15, 14];
  const membros = [
    [250, 172, 304, 122],
    [304, 122, 330, 84],
    [150, 176, 106, 238],
    [106, 238, 120, 290],
    [176, 300, 170, 476],
    [226, 300, 234, 476],
  ];

  marcar(() => {
    for (const [r, alfa] of [[30, 0.1], [24, 0.13], [19, 0.18], [16, 0.26]]) {
      for (const [a, b, c, d] of membros) capsula(t, a, b, c, d, r, TIJOLO, alfa);
      capsula(t, 200, 190, 200, 290, r + 38, TIJOLO, alfa);
      disco(t, 200, 96, r + 25, TIJOLO, alfa);
    }
  });
  marcar(() => {
    for (const [a, b, c, d] of membros) capsula(t, a, b, c, d, 13.5, CORPO);
    capsula(t, 200, 190, 200, 290, 52, CORPO);
    disco(t, 200, 96, 39, CORPO);
    capsula(t, 200, 130, 200, 152, 13, CORPO);
  });
  if (comRosto) {
    marcar(() => {
      disco(t, 187, 90, 4.2, mistura(TIJOLO, AREIA, 0.4), 0.95);
      disco(t, 213, 90, 4.2, mistura(TIJOLO, AREIA, 0.4), 0.95);
    });
  }
  return { t, cob };
}

const FRENTE = desenharFigura(true);
const COSTAS = desenharFigura(false);

// ------------------------------------------------------------- a coluna, mundo

const estacaoTopo = (k) => 520 + k * PASSO;
const camNaParada = (k) => estacaoTopo(k) - TOPO_NA_PARADA;

const MUNDO_A = Math.ceil(camNaParada(CORTES - 1) + PASSO + A + 200);

/*
  A coluna inteira e pintada UMA vez. Cada quadro so recorta a janela da
  camera. Repintar o fundo 432 vezes seria repintar o mesmo poco 432 vezes.

  O que faz a descida ser lida como descida: as faixas de luz passando, a
  fumaca em alturas fixas do mundo e o escurecimento conforme se desce para
  a brasa. Sem referencia parada no mundo, mover a camera nao parece mover.
*/
const mundo = novaTela(L, MUNDO_A);
for (let y = 0; y < MUNDO_A; y++) {
  const prof = y / MUNDO_A;
  for (let x = 0; x < L; x++) {
    const i = (y * L + x) * 3;
    // quanto mais fundo, mais quente e mais fechado
    let cor = mistura([44, 39, 37], CARVAO, Math.min(1, 0.2 + prof * 0.75));
    const paredes = Math.abs(x - L / 2) / (L / 2);
    cor = mistura(cor, CARVAO, paredes ** 2 * 0.7);
    cor = mistura(cor, BRASA, prof ** 2 * 0.3);
    mundo.px[i] = cor[0];
    mundo.px[i + 1] = cor[1];
    mundo.px[i + 2] = cor[2];
  }
}

/*
  Marcos parados no mundo. Sao ELES que fazem a descida ser lida: camera
  movendo contra fundo liso nao parece movimento nenhum, parece fundo liso.
*/
for (let f = 0; f * 340 < MUNDO_A; f++) {
  const y = 240 + f * 340;
  const forte = f % 3 === 0;
  const cor = mistura(CARAMELO, AREIA, forte ? 0.55 : 0.3);
  // o brilho em volta da viga
  halo(mundo, L / 2, y, L * 0.85, forte ? 78 : 52, cor, forte ? 0.3 : 0.17);
  // e a viga em si, fina e acesa, que e o que o olho fixa passando
  for (let dy = -1; dy <= 1; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= MUNDO_A) continue;
    for (let x = 0; x < L; x++) {
      const lateral = 1 - (Math.abs(x - L / 2) / (L / 2)) ** 1.4;
      pinta(mundo, x, yy, cor, lateral * (forte ? 0.55 : 0.3));
    }
  }
}

// fumaca parada em alturas do mundo
for (let n = 0; n < 70; n++) {
  const cx = (n * 137) % L;
  const cy = (n * 311) % MUNDO_A;
  halo(mundo, cx, cy, 170 + (n % 5) * 60, 90 + (n % 4) * 36, mistura(CARAMELO, AREIA, 0.32), 0.1, 1.6);
}

// halo em cada estacao, para o chef ter contra o que aparecer
for (let k = 0; k < CORTES; k++) {
  const cy = estacaoTopo(k) + FIG_A * 0.46;
  halo(mundo, L / 2, cy, 330, 340, mistura(CARAMELO, AREIA, 0.5), 0.4, 1.7);
  halo(mundo, L / 2, estacaoTopo(k) + FIG_A * 0.97, 230, 52, BRASA, 0.55, 1.5);
}

// ------------------------------------------------------------------ as brasas

const brasas = [];
for (let i = 0; i < 90; i++) {
  brasas.push({
    x: (i * 61) % L,
    y: (i * 373) % MUNDO_A,
    v: 40 + ((i * 13) % 9) * 14,
    r: 1 + ((i * 7) % 3) * 0.8,
    fase: (i * 17) % 100,
  });
}

// ------------------------------------------------------------- render e trilha

const saida = Buffer.allocUnsafe(L * A * 3);
const trilha = [];

/** Onde a camera esta, e qual estacao manda, para um p de 0 a 1. */
function camera(p) {
  const s = Math.min(CORTES - 0.0001, p * CORTES);
  const k = Math.floor(s);
  const u = s - k;
  const viagem = u <= PARADA ? 0 : suave((u - PARADA) / (1 - PARADA));
  return { k, u, camY: camNaParada(k) + viagem * PASSO, viagem };
}

function quadro(f) {
  const p = TOTAL > 1 ? f / (TOTAL - 1) : 0;
  const { k, u, camY } = camera(p);

  const t = novaTela(L, A);

  // recorte da coluna
  for (let y = 0; y < A; y++) {
    const my = Math.min(MUNDO_A - 1, Math.max(0, Math.round(camY + y)));
    t.px.set(mundo.px.subarray(my * L * 3, my * L * 3 + L * 3), y * L * 3);
  }

  // brasas: sobem no mundo, entao com a camera descendo elas passam voando
  for (const b of brasas) {
    const my = (((b.y - (f / 24) * b.v) % MUNDO_A) + MUNDO_A) % MUNDO_A;
    const sy = my - camY;
    if (sy < -10 || sy > A + 10) continue;
    const x = b.x + Math.sin((f / 24 + b.fase) * 0.8) * 14;
    disco(t, x, sy, b.r, mistura(TIJOLO, AREIA, 0.25), 0.6);
  }

  // A volta acontece na parada. Passou dela, ele fica de frente e a camera vai
  // embora: quem troca o corte agora e a descida, nao o giro.
  const giro = Math.min(1, u / PARADA);
  const ang = giro * 2 * Math.PI;

  let pratoQuadro = [0, 0, 0];

  // desenha a estacao atual e a proxima, que e a unica que pode entrar no quadro
  for (const est of [k, k + 1]) {
    if (est >= CORTES) continue;
    const topo = estacaoTopo(est) - camY;
    if (topo > A + 40 || topo + FIG_A < -40) continue;

    const ativa = est === k;
    const a = ativa ? ang : 0;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const larguraAparente = Math.max(Math.abs(cos), 0.17) * Math.sign(cos || 1);
    const usa = cos >= 0 ? FRENTE : COSTAS;
    const figL = FIG_L * Math.abs(larguraAparente);
    const espelha = cos < 0;

    for (let y = 0; y < FIG_A; y++) {
      const destY = Math.round(topo + y);
      if (destY < 0 || destY >= A) continue;
      const linha = Math.min(FA - 1, Math.max(0, Math.floor((y / FIG_A) * FA)));
      for (let x = 0; x < figL; x++) {
        let uu = x / figL;
        if (espelha) uu = 1 - uu;
        const sx = Math.min(FL - 1, Math.max(0, Math.floor(uu * FL)));
        const idx = linha * FL + sx;
        const cob = usa.cob[idx];
        if (cob <= 0) continue;
        const j = idx * 3;
        pinta(t, Math.round(L / 2 - figL / 2 + x), destY, [usa.t.px[j], usa.t.px[j + 1], usa.t.px[j + 2]], cob);
      }
    }

    // o prato, na mao, que orbita adiantada do eixo do corpo
    const angMao = a + FASE_DA_MAO;
    const cosMao = Math.cos(angMao);
    const sinMao = Math.sin(angMao);
    const vis = Math.min(1, Math.max(0, (cosMao + 0.12) / 0.45));
    const px = L / 2 + sinMao * 150;
    const py = topo + FIG_A * 0.34;
    if (vis > 0.01) {
      const esc = 0.76 + 0.24 * ((cosMao + 1) / 2);
      const rx = 74 * esc;
      const ry = 19 * esc;
      elipse(t, px, py + 9 * esc, rx, ry, [0, 0, 0], 0.4 * vis);
      elipse(t, px, py, rx, ry, mistura(CARVAO, AREIA, 0.3), vis);
      elipse(t, px, py - 3 * esc, rx * 0.78, ry * 0.72, mistura(CARVAO, AREIA, 0.12), vis);
      const tom = mistura(BRASA, TIJOLO, (est % 3) / 2);
      elipse(t, px, py - 5 * esc, rx * 0.46, ry * 0.85, tom, vis);
      elipse(t, px - rx * 0.14, py - 7 * esc, rx * 0.2, ry * 0.5, mistura(tom, CARAMELO, 0.5), vis * 0.8);
    }

    // a trilha guarda SO a estacao ativa, e so enquanto ela esta no quadro
    if (ativa) {
      const dentro = py > 40 && py < A - 40;
      pratoQuadro = [
        +((px / L) * 100).toFixed(2),
        +((py / A) * 100).toFixed(2),
        dentro ? +vis.toFixed(3) : 0,
      ];
    }
  }

  trilha.push(pratoQuadro);

  for (let i = 0; i < L * A * 3; i++) {
    const v = t.px[i];
    saida[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return saida;
}

let i = 0;
function escrever() {
  while (i < TOTAL) {
    const buf = quadro(i);
    i++;
    if (!process.stdout.write(buf)) {
      process.stdout.once('drain', escrever);
      return;
    }
  }
  const destino = process.argv[2];
  if (destino) {
    fs.writeFileSync(
      destino,
      JSON.stringify(
        {
          gerado: 'scripts/render-360.mjs',
          quadros: TOTAL,
          fps: 24,
          cortes: CORTES,
          proporcao: `${L} / ${A}`,
          prato: trilha,
        },
        null,
        0,
      ) + '\n',
    );
  }
  process.stdout.end();
}
escrever();
