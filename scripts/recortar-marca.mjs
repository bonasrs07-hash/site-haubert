/**
 * Extrai as fotos das pranchas do SOCIAL DNA para `src/assets/marca/`.
 *
 *   node scripts/recortar-marca.mjs
 *
 * POR QUE ISTO EXISTE, o cliente ainda não entregou acervo fotográfico
 * (BLK-002). O que existe são as 13 pranchas em `brand/`, e dentro delas há
 * fotografia embutida. Este script recorta essas fotos, converte para WebP e
 * grava só o que o site importa de fato.
 *
 * As coordenadas são FRAÇÃO da prancha, não pixel: se um PNG for reexportado
 * em outro tamanho, o recorte continua caindo no lugar certo. Elas foram
 * medidas na mão sobre a prancha renderizada, quando mexer, confira o
 * resultado com o olho, não com a fé.
 *
 * LIMITE DE ORIGEM, a foto tem, dentro da prancha, de 250 a 660 px de
 * largura. É o teto. Serve para cartão e ladrilho; não serve para fundo
 * full-bleed. Ver `src/constants/imagens.ts` e o ADR-007.
 */
import sharp from 'sharp';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const DESTINO = 'src/assets/marca';
const QUALIDADE = 80;

/** Recortes, por prancha. `fx`/`fy` são [início, fim] em fração de 0 a 1. */
const PRANCHAS = {
  'brand/HAUBERT - Color Palette 2.png': [
    // A fila de cima traz legenda chapada sobre a foto; o recorte começa abaixo dela.
    { nome: 'salao-dia', fx: [0.256, 0.452], fy: [0.308, 0.605] },
    { nome: 'salao-noite', fx: [0.576, 0.799], fy: [0.308, 0.605] },
    { nome: 'cafe-latte', fx: [0.256, 0.3395], fy: [0.62, 0.795] },
    { nome: 'prato-brunch', fx: [0.344, 0.417], fy: [0.62, 0.795] },
    { nome: 'dj-cultura', fx: [0.423, 0.512], fy: [0.62, 0.795] },
    { nome: 'brinde-tacas', fx: [0.5165, 0.5995], fy: [0.62, 0.795] },
    { nome: 'carnes-grelha', fx: [0.6135, 0.697], fy: [0.62, 0.795] },
  ],
  'brand/HAUBERT - Color Palette 4.png': [
    { nome: 'fogo-lenha', fx: [0.1935, 0.3265], fy: [0.25, 0.428] },
    // Os cinco elementos, na mesma ordem de ELEMENTOS_DO_FOGO.
    { nome: 'el-1-madeira', fx: [0.1925, 0.3], fy: [0.467, 0.604] },
    { nome: 'el-2-brasa', fx: [0.3035, 0.4075], fy: [0.467, 0.604] },
    { nome: 'el-3-tecnica', fx: [0.411, 0.5175], fy: [0.467, 0.604] },
    { nome: 'el-4-fumaca', fx: [0.521, 0.625], fy: [0.467, 0.604] },
    { nome: 'el-5-descanso', fx: [0.629, 0.739], fy: [0.467, 0.604] },
  ],
  'brand/HAUBERT - Color Palette 6.png': [
    { nome: 'time-abraco', fx: [0.32, 0.795], fy: [0.698, 0.86] },
  ],
  // Esta prancha tem DOIS quadros empilhados (009 em cima, 010 embaixo).
  'brand/HAUBERT - Color Palette 9.png': [
    { nome: 'neon-local', fx: [0.4225, 0.539], fy: [0.145, 0.297] },
  ],
};

const esperados = Object.values(PRANCHAS)
  .flat()
  .map((r) => `${r.nome}.webp`);

await mkdir(DESTINO, { recursive: true });

for (const [prancha, recortes] of Object.entries(PRANCHAS)) {
  const { width: L, height: A } = await sharp(prancha).metadata();
  for (const r of recortes) {
    const destino = path.join(DESTINO, `${r.nome}.webp`);
    await sharp(prancha)
      .extract({
        left: Math.round(r.fx[0] * L),
        top: Math.round(r.fy[0] * A),
        width: Math.round((r.fx[1] - r.fx[0]) * L),
        height: Math.round((r.fy[1] - r.fy[0]) * A),
      })
      .webp({ quality: QUALIDADE, effort: 6 })
      .toFile(destino);

    const { width, height } = await sharp(destino).metadata();
    console.log(`${r.nome.padEnd(16)} ${width}x${height}`);
  }
}

// Recorte que saiu da lista some da pasta: asset órfão em src/ é o mesmo
// problema que doc zumbi em docs/, alguém acha e acha que vale.
const orfaos = (await readdir(DESTINO)).filter((f) => !esperados.includes(f));
for (const f of orfaos) {
  await unlink(path.join(DESTINO, f));
  console.log(`removido (órfão)  ${f}`);
}

console.log(`\n${esperados.length} recortes em ${DESTINO}`);
