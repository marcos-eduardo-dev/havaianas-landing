// Remove o fundo branco das fotos em /fotos e gera, para cada uma, o par e um pé só
// em /public/sandals. Uso: node scripts/cutout.mjs [limiar]
import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const SRC = "fotos";
const OUT = "public/sandals";
// Limiar de "branco" por arquivo: quanto mais claro o chinelo, mais alto precisa ser.
const THRESHOLD = { default: 240, "brasil-branco": 250 };

const KEEP_HOLES = new Set(["brasil-branco"]);

async function cutout(file) {
  const name = path.parse(file).name;
  const T = THRESHOLD[name] ?? THRESHOLD.default;
  const { data, info } = await sharp(path.join(SRC, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;

  let transparent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 250) transparent++;

  const alpha = new Uint8Array(n).fill(255);
  if (transparent > n * 0.02) {
    for (let i = 0; i < n; i++) alpha[i] = data[i * 4 + 3];
  } else {
    // Preenche a partir das bordas: só o branco ligado ao fundo vira transparente.
    const isWhite = (i) =>
      Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= T;
    const stack = [];
    const push = (i) => {
      if (alpha[i] && isWhite(i)) {
        alpha[i] = 0;
        stack.push(i);
      }
    };
    for (let x = 0; x < w; x++) (push(x), push((h - 1) * w + x));
    for (let y = 0; y < h; y++) (push(y * w), push(y * w + w - 1));
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < n - w) push(i + w);
    }
    // Vãos brancos fechados (entre a tira e o solado) também são fundo.
    // Em chinelo claro isso apagaria o próprio produto, então fica desligado.
    if (!KEEP_HOLES.has(name)) {
      const seen = new Uint8Array(n);
      const minArea = n * 0.00005;
      for (let s0 = 0; s0 < n; s0++) {
        if (seen[s0] || !alpha[s0] || !isWhite(s0)) continue;
        const region = [s0];
        seen[s0] = 1;
        for (let k = 0; k < region.length; k++) {
          const i = region[k];
          const x = i % w;
          for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
            if (j < 0 || j >= n || seen[j] || !alpha[j] || !isWhite(j)) continue;
            seen[j] = 1;
            region.push(j);
          }
        }
        if (region.length >= minArea) for (const i of region) alpha[i] = 0;
      }
    }
    // Come 1px da borda para tirar o halo branco.
    const src = alpha.slice();
    for (let i = 0; i < n; i++) {
      if (!src[i]) continue;
      const x = i % w;
      if (
        (x > 0 && !src[i - 1]) ||
        (x < w - 1 && !src[i + 1]) ||
        (i >= w && !src[i - w]) ||
        (i < n - w && !src[i + w])
      )
        alpha[i] = 0;
    }
  }

  const softAlpha = await sharp(Buffer.from(alpha), {
    raw: { width: w, height: h, channels: 1 },
  })
    .blur(0.6)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const rgba = Buffer.from(data);
  for (let i = 0; i < n; i++) rgba[i * 4 + 3] = softAlpha[i];

  // Coluna mais vazia perto do meio = vão entre os dois pés.
  let gap = Math.round(w / 2);
  let best = Infinity;
  for (let x = Math.round(w * 0.4); x < w * 0.6; x++) {
    let c = 0;
    for (let y = 0; y < h; y++) if (alpha[y * w + x]) c++;
    if (c < best) ((best = c), (gap = x));
  }

  // Recorta na caixa que contém os pixels opacos entre as colunas x0 e x1.
  const save = async (x0, x1, suffix, size) => {
    let minX = x1, maxX = x0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++)
      for (let x = x0; x < x1; x++)
        if (softAlpha[y * w + x] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
      .resize({ height: size, withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 95 })
      .toFile(path.join(OUT, `${name}-${suffix}.webp`));
  };

  const pair = await save(0, w, "pair", 1100);
  const single = await save(0, gap, "single", 700);
  console.log(`${name}: ${w}x${h} T=${T} gap=${gap}(${best}) → pair ${pair.width}x${pair.height}, single ${single.width}x${single.height}`);
}

for (const f of await readdir(SRC)) {
  if (/\.(png|jpe?g|webp)$/i.test(f)) await cutout(f);
}
