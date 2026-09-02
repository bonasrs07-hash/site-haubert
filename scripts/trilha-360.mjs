/**
 * A trilha do prato de `/360`, marcada a olho sobre o video de referencia.
 *
 * NAO e rastreamento: sao pontos lidos na imagem, quadro a quadro, e
 * interpolados entre eles. Foi conferido desenhando o alvo por cima dos
 * quadros do video, que e a unica forma honesta de saber se acertou.
 *
 * Existe porque o botao da ficha precisa pousar em cima do prato, e nenhuma
 * formula sabe onde o prato esta num video qualquer. Tentei medir por brilho
 * antes: o detector agarrava a bancada e a parede, o x pulava de 23% a 72%.
 * Botao tremendo e pior que botao aproximado.
 *
 * Quando entrar o footage real, o certo e rastrear de verdade e gerar o mesmo
 * formato: `[x, y, visibilidade]` por quadro, x e y em porcentagem do quadro.
 *
 *   node scripts/trilha-360.mjs src/generated/trilha-360.json
 */
import fs from 'node:fs';
const QUADROS = 233;
const marcas = [
  [0, 43, 53, 1], [2, 43, 53, 1], [12, 50, 52, 0.45], [22, 36, 53, 0.8],
  [32, 66, 52, 1], [42, 33, 53, 0.65], [52, 42, 53, 0.35], [62, 38, 52, 0.85],
  [72, 45, 53, 0], [82, 45, 53, 1], [92, 45, 53, 0], [102, 45, 53, 1],
  [112, 48, 53, 0.3], [122, 41, 53, 0.75], [132, 50, 53, 0.35], [142, 45, 53, 1],
  [152, 45, 53, 0], [162, 45, 53, 1], [172, 45, 53, 0], [182, 45, 53, 1],
  [192, 37, 53, 0.4], [202, 48, 53, 0.7], [212, 45, 53, 1], [222, 45, 53, 0],
  [232, 45, 53, 1],
];
const prato = [];
for (let f = 0; f < QUADROS; f++) {
  let i = 0;
  while (i < marcas.length - 2 && marcas[i + 1][0] <= f) i++;
  const [fa, xa, ya, va] = marcas[i];
  const [fb, xb, yb, vb] = marcas[Math.min(i + 1, marcas.length - 1)];
  const t = fb === fa ? 0 : Math.min(1, Math.max(0, (f - fa) / (fb - fa)));
  prato.push([
    +(xa + (xb - xa) * t).toFixed(2),
    +(ya + (yb - ya) * t).toFixed(2),
    +(va + (vb - va) * t).toFixed(3),
  ]);
}
fs.writeFileSync(process.argv[2], JSON.stringify({
  origem: 'haubert360.mp4 (Luma AI), marcado a olho quadro a quadro',
  aviso: 'Posicao do prato ESTIMADA na imagem, nao rastreada. O footage real precisa de uma trilha medida.',
  quadros: QUADROS,
  fps: 24,
  cortes: 6,
  proporcao: '960 / 540',
  prato,
}) + '\n');
console.log('trilha:', prato.length, 'quadros | clicaveis:', prato.filter((p) => p[2] > 0.35).length);
