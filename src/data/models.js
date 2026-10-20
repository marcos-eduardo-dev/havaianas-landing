// Modelos do hero. As imagens saem de /fotos pelo script `node scripts/cutout.mjs`,
// que remove o fundo branco e grava o par e um pé só em /public/sandals.

const base = [
  {
    key: "pride",
    word: "Pride",
    name: "Havaianas Top Pride",
    text: "Arco-íris, flores e a frase que diz tudo: love is love.",
    bg: "#e8388a",
    dot: "#2a2f7a",
  },
  {
    key: "brasil-verde",
    word: "Brasil",
    name: "Havaianas Brasil Logo",
    text: "Verde e amarelo com a bandeirinha na tira. O par mais brasileiro que existe.",
    bg: "#1d4fc4",
    dot: "#1f9d55",
  },
  {
    key: "brasil-preto",
    word: "Preto",
    name: "Havaianas Brasil Preto",
    text: "Todo preto, com a bandeira como único detalhe. Combina com tudo.",
    bg: "#0c9a55",
    dot: "#1c1c1c",
  },
  {
    key: "brasil-branco",
    word: "Branco",
    name: "Havaianas Brasil Branco",
    text: "Branco limpo, do jeito que virou clássico de verão.",
    bg: "#ef4b3f",
    dot: "#ffffff",
  },
];

export const models = base.map((m) => ({
  ...m,
  pair: `/sandals/${m.key}-pair.webp`,
  single: `/sandals/${m.key}-single.webp`,
}));
