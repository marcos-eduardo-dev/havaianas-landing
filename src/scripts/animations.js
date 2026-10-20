import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
clearTimeout(window.__introFallback);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;

/* Quebra o texto em palavras e letras; o leitor de tela recebe o texto inteiro. */
function split(el, text, { chars = true } = {}) {
  el.setAttribute("aria-label", text);
  el.replaceChildren();
  const out = [];
  text.split(" ").forEach((w, i, all) => {
    const word = document.createElement("span");
    word.className = "word";
    word.setAttribute("aria-hidden", "true");
    if (chars) {
      for (const ch of w) {
        const c = document.createElement("span");
        c.className = "char";
        c.textContent = ch;
        word.appendChild(c);
        out.push(c);
      }
    } else {
      word.textContent = w;
      out.push(word);
    }
    el.appendChild(word);
    if (i < all.length - 1) el.appendChild(document.createTextNode(" "));
  });
  return out;
}

/* ── Menu ─────────────────────────────────────────────── */
const top = $("#top");
const onScroll = () => top.classList.toggle("is-scrolled", scrollY > 56);
onScroll();
addEventListener("scroll", onScroll, { passive: true });

/* ── Hero: troca de modelo ────────────────────────────── */
const hero = $("#hero");
const models = JSON.parse(hero.dataset.models);
const word = $("#hero-word");
const wipe = $("#hero-wipe");
const flip = $("#hero-flip");
const heroImg = $("#hero-img");
const brandImg = $("#brand-img");
const orbitImgs = $$(".orbit img");
const dots = $$(".hero-dot");

let current = 0;
let busy = false;
let wordChars = split(word, models[0].word);
word.removeAttribute("aria-label");

models.forEach((m) => {
  new Image().src = m.pair;
  new Image().src = m.single;
});

function applyModel(m, index) {
  heroImg.src = m.pair;
  brandImg.src = m.pair;
  orbitImgs.forEach((img) => (img.src = m.single));
  dots.forEach((d, i) => d.setAttribute("aria-pressed", String(i === index)));
  document.body.style.setProperty("--accent", m.bg);
}

function goTo(next) {
  if (busy || next === current) return;
  const m = models[next];

  if (reduce) {
    applyModel(m, next);
    wordChars = split(word, m.word);
    word.removeAttribute("aria-label");
    hero.style.setProperty("--hero-bg", m.bg);
    current = next;
    return;
  }

  busy = true;
  const swapAt = 0.47;

  gsap
    .timeline({
      onComplete() {
        current = next;
        busy = false;
      },
    })
    .to(
      wordChars,
      {
        yPercent: -60,
        opacity: 0,
        duration: 0.25,
        stagger: { each: 0.02, from: "end" },
        ease: "power2.in",
      },
      0,
    )
    .to(
      orbitImgs,
      {
        opacity: 0,
        scale: 0.8,
        rotation: () => gsap.utils.random(-16, 16),
        duration: 0.35,
        stagger: { each: 0.04, from: "center" },
        ease: "power2.in",
      },
      0,
    )
    .to(flip, { rotationY: 90, duration: 0.42, ease: "power2.in" }, 0.05)
    .fromTo(
      wipe,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.7,
        ease: "power2.inOut",
        onStart: () => (wipe.style.backgroundColor = m.bg),
      },
      0.05,
    )
    .add(() => {
      applyModel(m, next);
      wordChars = split(word, m.word);
      word.removeAttribute("aria-label");
      gsap.fromTo(
        wordChars,
        { yPercent: 60, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.035,
          ease: "power3.out",
        },
      );
    }, swapAt)
    .set(flip, { rotationY: -90 }, swapAt)
    .to(flip, { rotationY: 0, duration: 0.5, ease: "power2.out" }, swapAt)
    .to(
      orbitImgs,
      {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 0.5,
        stagger: { each: 0.05, from: "random" },
        ease: "back.out(1.4)",
      },
      swapAt + 0.08,
    )
    .add(() => {
      hero.style.setProperty("--hero-bg", m.bg);
      gsap.set(wipe, { scaleX: 0 });
    }, 0.8);
}

/* Troca sozinho enquanto o hero está na tela e a aba está visível. */
let timer;
function autoplay() {
  clearInterval(timer);
  if (reduce) return;
  timer = setInterval(() => {
    if (document.hidden || scrollY > innerHeight * 0.5) return;
    goTo((current + 1) % models.length);
  }, 4500);
}

dots.forEach((dot) =>
  dot.addEventListener("click", () => {
    goTo(Number(dot.dataset.index));
    autoplay();
  }),
);

/* ── Hero: entrada ────────────────────────────────────── */
let intro;
if (!reduce) {
  intro = gsap
    .timeline({ paused: true, defaults: { ease: "power3.out" } })
    .from(wordChars, { yPercent: 60, opacity: 0, duration: 1.2, stagger: 0.05 }, 0)
    .from(
      "#hero-product",
      { y: -innerHeight * 0.5, opacity: 0, duration: 1.6, ease: "power2.out" },
      0.1,
    )
    .from(".orbit-l", { x: -220, opacity: 0, duration: 1.4, stagger: 0.15 }, 0.25)
    .from(".orbit-r", { x: 220, opacity: 0, duration: 1.4, stagger: 0.15 }, 0.35)
    .from(".hero-bottom > *", { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.6);
}
document.documentElement.classList.remove("js");

/* ── Abertura: logo quica, chinelos abrem em leque, contador vai a 100 ─ */
const root = document.documentElement;
const splash = $("#splash");
const startSite = () => {
  intro?.play();
  autoplay();
};

if (splash && root.classList.contains("splash-on")) {
  const sandals = $$(".splash-sandal", splash);
  const letters = $$(".splash-letter", splash);
  const count = $("#splash-count");
  const fan = [-33, -11, 11, 33];
  const tick = { v: 0 };
  const closed = { rotation: 0, scale: 0, y: 70 };
  let started = false;

  /* O fundo da abertura é o mesmo do hero: ela só some e o hero assume. */
  const reveal = () => {
    if (started) return;
    started = true;
    startSite();
    gsap.to(splash, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power1.out",
      onComplete() {
        splash.remove();
        root.classList.remove("splash-on");
      },
    });
  };

  const show = gsap
    .timeline()
    .to(
      tick,
      {
        v: 100,
        duration: 2,
        ease: "power1.inOut",
        onUpdate: () => (count.textContent = Math.round(tick.v)),
      },
      0,
    )
    .from(
      letters,
      {
        yPercent: 130,
        opacity: 0,
        scale: 0.6,
        rotation: () => gsap.utils.random(-25, 25),
        duration: 0.7,
        stagger: 0.055,
        ease: "back.out(2)",
      },
      0.1,
    )
    .fromTo(
      sandals,
      closed,
      { rotation: (i) => fan[i], scale: 1, y: 0, duration: 0.8, stagger: 0.07, ease: "back.out(1.8)" },
      0.55,
    )
    .to(sandals, { ...closed, duration: 0.4, stagger: { each: 0.04, from: "end" }, ease: "back.in(1.6)" }, 2.1)
    .to(letters, { yPercent: 130, opacity: 0, duration: 0.4, stagger: 0.03, ease: "power2.in" }, 2.2)
    .to(".splash-count, .splash-skip", { autoAlpha: 0, duration: 0.25 }, 2.3)
    .add(reveal, 2.65);

  $(".splash-skip", splash).addEventListener("click", () => {
    show.kill();
    reveal();
  });
} else {
  splash?.remove();
  startSite();
}

/* ── Hero: parallax do produto com o mouse ────────────── */
if (!touch && !reduce) {
  const px = gsap.quickTo("#hero-parallax", "x", { duration: 1.1, ease: "power2.out" });
  const py = gsap.quickTo("#hero-parallax", "y", { duration: 1.1, ease: "power2.out" });
  hero.addEventListener("mousemove", (e) => {
    px((e.clientX / innerWidth - 0.5) * 24);
    py((e.clientY / innerHeight - 0.5) * -16);
  });
}

/* ── Produto viaja do hero até a seção da marca ───────── */
if (!reduce) {
  const fly = document.createElement("img");
  fly.className = "fly-img";
  fly.alt = "";
  document.body.appendChild(fly);
  brandImg.style.opacity = "0";

  const place = (self) => {
    const p = self.progress;

    if (p < 0.01 || p > 0.995) {
      const landed = p > 0.995;
      fly.style.visibility = "hidden";
      heroImg.style.opacity = landed ? "0" : "";
      brandImg.style.opacity = landed ? "1" : "0";
      return;
    }

    const a = heroImg.getBoundingClientRect();
    const b = brandImg.getBoundingClientRect();
    if (a.width < 4 || b.width < 4) return;

    if (fly.src !== heroImg.src) fly.src = heroImg.src;

    /* Curva: desvia para o lado e inclina no meio do caminho, zerando nas pontas. */
    const arc = Math.sin(Math.PI * p);
    const w = lerp(a.width, b.width, p);
    const h = lerp(a.height, b.height, p);
    const cx = lerp(a.left + a.width / 2, b.left + b.width / 2, p) - arc * innerWidth * 0.06;
    const cy = lerp(a.top + a.height / 2, b.top + b.height / 2, p);

    fly.style.width = `${w}px`;
    fly.style.height = `${h}px`;
    fly.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${arc * -12}deg)`;
    fly.style.visibility = "visible";
    heroImg.style.opacity = "0";
    brandImg.style.opacity = "0";
  };

  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    endTrigger: brandImg,
    end: "center center",
    scrub: 0.5,
    onUpdate: place,
    onRefresh: place,
  });
}

/* ── Títulos: letra por letra presa ao scroll ─────────── */
$$("[data-float]").forEach((el) => {
  const chars = split(el, el.textContent.trim());
  if (reduce) return;
  gsap.from(chars, {
    opacity: 0,
    yPercent: 110,
    scaleY: 2.2,
    scaleX: 0.7,
    transformOrigin: "50% 0%",
    ease: "back.inOut(2)",
    stagger: 0.03,
    scrollTrigger: { trigger: el, start: "top 95%", end: "top 55%", scrub: true },
  });
});

/* ── Parágrafo: palavra por palavra, de borrado a nítido ─ */
$$("[data-reveal]").forEach((el) => {
  const words = split(el, el.textContent.trim().replace(/\s+/g, " "), { chars: false });
  if (reduce) return;
  gsap.from(words, {
    opacity: 0.12,
    filter: "blur(4px)",
    ease: "none",
    stagger: 0.05,
    scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 60%", scrub: true },
  });
});

/* ── Cards empilhados que se abrem com o scroll ───────── */
const pillars = $$(".pillar");
if (!reduce && pillars.length > 1) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".pillars",
      start: "top 88%",
      end: "top 38%",
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });
  pillars.slice(1).forEach((card, i) => {
    tl.from(
      card,
      {
        y: () => pillars[0].offsetTop - card.offsetTop + (i + 1) * 10,
        scale: 1 - (i + 1) * 0.04,
        ease: "power2.out",
      },
      i * 0.35,
    );
  });
}

/* ── Cards de modelo: entrada, inclinação 3D e brilho ─── */
const cards = $$(".model-card");
if (!reduce) {
  gsap.from(cards, {
    opacity: 0,
    y: 60,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.12,
    scrollTrigger: { trigger: ".model-grid", start: "top 80%", once: true },
  });
}

if (!touch && !reduce) {
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--gx", `${x * 100}%`);
      card.style.setProperty("--gy", `${y * 100}%`);
      gsap.to(card, {
        rotateX: (y - 0.5) * -14,
        rotateY: (x - 0.5) * 14,
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
    });
  });
}

/* ── Números: contagem ao entrar na tela ──────────────── */
if (!reduce) {
  $$(".stat-count").forEach((el) => {
    const target = Number(el.dataset.target);
    const format = (v) =>
      el.dataset.plain ? String(Math.round(v)) : Math.round(v).toLocaleString("pt-BR");
    const proxy = { v: Number(el.dataset.from || 0) };
    el.textContent = format(proxy.v);
    gsap.to(proxy, {
      v: target,
      duration: 1.8,
      ease: "power2.out",
      onUpdate: () => (el.textContent = format(proxy.v)),
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });
}

/* ── Botão magnético ──────────────────────────────────
   overwrite "auto" (e não true): true mataria também a animação de entrada do botão
   se o mouse estivesse por perto, e ele ficaria invisível. */
if (!touch && !reduce) {
  $$(".magnet").forEach((el) => {
    const inner = $(".magnet-inner", el);
    const reach = 70;
    let active = false;
    addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
      if (near) {
        active = true;
        gsap.to(el, { x: dx / 3, y: dy / 3, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        gsap.to(inner, { x: dx / 8, y: dy / 8, duration: 0.3, ease: "power2.out", overwrite: "auto" });
      } else if (active) {
        active = false;
        gsap.to([el, inner], { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
      }
    });
  });
}

/* Fontes e imagens mudam alturas; recalcula os gatilhos depois que carregam. */
addEventListener("load", () => ScrollTrigger.refresh());
