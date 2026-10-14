import { bands, loaderStatuses, terminalCode } from './journeyText';

export interface JourneyOptions {
  skipIntro?: boolean;
  galaxyDensity?: number;
  armCount?: number;
  /** total scroll length of the journey, in vh */
  journeyLength?: number;
}

/** below this width the layouts stack (planet above services, 2-col work grid) */
export const MOBILE_BREAKPOINT = 760;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIO = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bell = (p: number, c: number, w: number) => Math.exp(-((p - c) / w) * ((p - c) / w));
const rnd = Math.random;
const TAU = Math.PI * 2;

type SpriteKey = 'w' | 'b' | 'c' | 'v' | 'a';
interface GalaxyStar { r: number; th: number; k: SpriteKey; sz: number; tw: number; tws: number; sx: number; sy: number; d: number }
interface Nebula { r: number; th: number; rad: number; img: HTMLCanvasElement }
interface FarStar { x: number; y: number; sz: number; a: number; tw: number; tws: number }
interface Orbiter { o: number; a: number; w: number; s: number; img: HTMLCanvasElement }
interface Stage { el: HTMLElement; in0: number; in1: number; out0: number; out1: number; maxZ: number; drift: number; enterFrom: number; ey: number }

const mkCanvas = (size: number) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
};

// pre-rendered glow sprites (no per-frame gradient allocation)
const mkGlow = (size: number, stops: [number, string][]) => {
  const c = mkCanvas(size);
  const x = c.getContext('2d');
  if (!x) return c;
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => { g.addColorStop(o, col); });
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
};
const sprite = (color: string, inner: string) => mkGlow(64, [[0, inner], [0.18, color], [1, 'rgba(0,0,0,0)']]);

/**
 * Drives the whole scroll journey: loader, canvas galaxy → solar system → planet,
 * stage zooms, threshold reveals, typed terminal, HUD and custom cursor.
 * Everything is queried from `root` by data attributes. Returns a cleanup function.
 */
export function runJourney(root: HTMLElement, opts: JourneyOptions = {}): () => void {
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const qa = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
  const mm = (s: string) => typeof window.matchMedia === 'function' && window.matchMedia(s).matches;
  const reduced = mm('(prefers-reduced-motion: reduce)');
  const skip = (opts.skipIntro ?? false) || reduced;
  let dead = false;
  let raf = 0;
  const timers: number[] = [];
  const cleanups: (() => void)[] = [];
  const listen = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void) => {
    addEventListener(type, fn);
    cleanups.push(() => { removeEventListener(type, fn); });
  };

  const track = q('[data-track]');
  if (track) track.style.height = String(clamp(opts.journeyLength ?? 1100, 500, 1600)) + 'vh';

  // ---------- canvas: bloomy galaxy ----------
  const cv = q('[data-gal]') as HTMLCanvasElement | null;
  const ctx = cv?.getContext('2d') ?? null;
  const planetStage = q('[data-stage="planet"]');
  let W = innerWidth, H = innerHeight, scrollMax = 1;
  // where the planet rests on screen (fraction of viewport) and its resting radius
  let AX = 0.63, AY = 0.5, Rend = 1;
  const planetDef = { el: planetStage, in0: 0.30, in1: 0.36, out0: 0.60, out1: 0.67, maxZ: 10, drift: 1.08, enterFrom: 1, ey: 0 };
  const measure = () => {
    W = innerWidth; H = innerHeight;
    if (cv && ctx) {
      const DPR = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    scrollMax = Math.max(1, document.documentElement.scrollHeight - H);
    const mobile = W < MOBILE_BREAKPOINT;
    AX = mobile ? 0.5 : 0.63;
    AY = mobile ? 0.27 : 0.5;
    // keep in sync with .j-pwrap sizes in Journey.css
    Rend = mobile ? Math.min(0.27 * W, 0.14 * H) : Math.min(0.28 * Math.min(W, H), 0.21 * W);
    if (planetStage) planetStage.style.transformOrigin = `${String(AX * 100)}% ${String(AY * 100)}%`;
    const cue = q('[data-cue]');
    if (cue) cue.style.display = H < 650 || mobile ? 'none' : 'flex';
    // slow zoom while parked in orbit; kept small so the services column never crops off-screen
    planetDef.drift = mobile ? 1.04 : 1.08;
  };
  measure();
  listen('resize', measure);
  timers.push(window.setTimeout(measure, 300));

  const SPR: Record<SpriteKey, HTMLCanvasElement> = {
    w: sprite('rgba(200,215,255,0.55)', 'rgba(255,255,255,1)'),
    b: sprite('rgba(110,150,255,0.5)', 'rgba(235,242,255,1)'),
    c: sprite('rgba(0,229,255,0.5)', 'rgba(220,255,255,1)'),
    v: sprite('rgba(150,110,255,0.5)', 'rgba(240,232,255,1)'),
    a: sprite('rgba(255,190,120,0.55)', 'rgba(255,244,225,1)'),
  };
  const KEYS: SpriteKey[] = ['w', 'w', 'b', 'b', 'c', 'v', 'a'];
  const N = clamp(opts.galaxyDensity ?? 1100, 300, 2600);
  const ARMS = clamp(opts.armCount ?? 4, 2, 6);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const maxR = Math.max(W, H) * 0.46;
  const P: GalaxyStar[] = [], NEB: Nebula[] = [], FAR: FarStar[] = [];
  // dense bulge + field stars + loose arms that dissolve outward
  for (let i = 0; i < N; i++) {
    const u = rnd();
    let r: number, th: number;
    if (u < 0.28) { r = Math.abs(gauss()) * maxR * 0.17; th = rnd() * TAU; }
    else if (u < 0.38) { r = Math.pow(rnd(), 1.1) * maxR; th = rnd() * TAU; }
    else { r = Math.pow(rnd(), 1.45) * maxR; th = (i % ARMS) * TAU / ARMS + (r / maxR) * 3.1 + gauss() * (0.4 + 0.34 * (r / maxR)); }
    const core = r < maxR * 0.18;
    P.push({
      r, th,
      k: core ? 'a' : KEYS[Math.floor(rnd() * KEYS.length)],
      sz: (0.5 + rnd() * 1.6) * (core ? 1.55 : 1) * (1 - 0.3 * (r / maxR)),
      tw: rnd() * TAU, tws: 0.6 + rnd() * 2.2,
      sx: (rnd() - 0.5) * W * 1.7, sy: (rnd() - 0.5) * H * 1.7,
      d: rnd() * 0.5,
    });
  }
  const NEBC = ['rgba(80,110,255,', 'rgba(0,229,255,', 'rgba(160,110,255,', 'rgba(255,170,110,'];
  for (let i = 0; i < 9; i++) {
    const r = (0.15 + rnd() * 0.6) * maxR;
    NEB.push({ r, th: (i % ARMS) * TAU / ARMS + (r / maxR) * 3.1 + gauss() * 0.3, rad: 110 + rnd() * 180, img: mkGlow(128, [[0, NEBC[i % 4] + '0.09)'], [1, NEBC[i % 4] + '0)']]) });
  }
  const coreImg = mkGlow(512, [[0, 'rgba(255,244,222,0.95)'], [0.2, 'rgba(255,214,160,0.4)'], [0.55, 'rgba(140,150,255,0.12)'], [1, 'rgba(0,0,0,0)']]);
  const flareImg = mkGlow(256, [[0, 'rgba(255,250,240,0.6)'], [0.4, 'rgba(0,229,255,0.15)'], [1, 'rgba(0,0,0,0)']]);
  const sunImg = mkGlow(512, [[0, 'rgba(255,255,255,1)'], [0.14, 'rgba(255,246,230,0.98)'], [0.3, 'rgba(255,210,150,0.5)'], [0.6, 'rgba(255,170,110,0.14)'], [1, 'rgba(0,0,0,0)']]);
  // camera focus: a point ON an arm we dive toward (rotates with the disc)
  const fr = maxR * 0.55;
  let fTh = (fr / maxR) * 3.1;
  const ORB: Orbiter[] = [
    { o: 1, a: rnd() * TAU, w: 0.003, s: 3.5, img: mkGlow(64, [[0, 'rgba(255,190,140,1)'], [0.6, 'rgba(120,60,30,0.8)'], [1, 'rgba(0,0,0,0)']]) },
    { o: 3, a: rnd() * TAU, w: 0.0015, s: 5, img: mkGlow(64, [[0, 'rgba(180,160,255,1)'], [0.6, 'rgba(70,60,140,0.8)'], [1, 'rgba(0,0,0,0)']]) },
  ];
  let tAng = rnd() * TAU, frameC = 0;
  for (let i = 0; i < 340; i++) FAR.push({ x: rnd() * W, y: rnd() * H, sz: 0.4 + rnd() * 0.9, a: 0.12 + rnd() * 0.3, tw: rnd() * TAU, tws: 0.3 + rnd() * 1.4 });

  let mx = 0, my = 0, smx = 0, smy = 0, ssy = scrollY;
  listen('mousemove', e => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; });

  // ---------- loader ----------
  const loader = q('[data-loader]'), counter = q('[data-count]'), statusEl = q('[data-status0]');
  let stI = 1;
  const stInt = window.setInterval(() => { if (statusEl) statusEl.textContent = '> ' + loaderStatuses[stI++ % loaderStatuses.length] + '_'; }, 460);
  if (!skip) document.body.style.overflow = 'hidden';
  const t0 = performance.now() + (skip ? -99999 : 350);
  let finished = false;

  // ---------- scramble ----------
  const CH = '!<>-_\\/[]{}=+*^?#';
  const scramble = (el: HTMLElement, dur = 650) => {
    const fin = el.dataset.txt ?? (el.dataset.txt = el.textContent ?? '');
    const st = performance.now();
    const tick = () => {
      if (dead) return;
      const p2 = clamp((performance.now() - st) / dur, 0, 1);
      const n = Math.floor(p2 * fin.length);
      let out = fin.slice(0, n);
      for (let i = n; i < fin.length; i++) out += fin[i] === ' ' ? ' ' : CH[Math.floor(rnd() * CH.length)];
      el.textContent = out;
      if (p2 < 1) requestAnimationFrame(tick);
    };
    tick();
  };
  // an element scrambles itself, or a nested [data-scr] child (keeps sibling accents intact)
  const scrTarget = (el: HTMLElement) => el.dataset.scr != null ? el : el.querySelector<HTMLElement>('[data-scr]');

  const heroEls = qa('[data-hero]');
  const hud = q('[data-hud]');
  const nav = q('[data-nav]');
  const finish = () => {
    finished = true;
    clearInterval(stInt);
    if (statusEl) statusEl.textContent = '> deployed. scroll to travel.';
    if (loader) {
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      timers.push(window.setTimeout(() => { loader.style.display = 'none'; }, 900));
    }
    document.body.style.overflow = '';
    heroEls.forEach((el, i) => {
      timers.push(window.setTimeout(() => {
        el.style.opacity = '1';
        if (el.dataset.cue == null) el.style.transform = 'none';
        const t = scrTarget(el);
        if (t) scramble(t, 650 + i * 110);
      }, 90 * i));
    });
    if (nav) { nav.style.opacity = '1'; nav.style.transform = 'none'; }
    if (hud) hud.style.opacity = '1';
  };

  // ---------- stages ----------
  const stg = (name: string) => q('[data-stage="' + name + '"]');
  const hero = stg('hero'), hLines = qa('[data-hline]');
  const pwrap = q('[data-pwrap]');
  const stageDefs: (Omit<Stage, 'el'> & { el: HTMLElement | null })[] = [
    planetDef,
    { el: stg('surface'), in0: 0.635, in1: 0.70, out0: 0.84, out1: 0.90, maxZ: 11, drift: 1.18, enterFrom: 1.7, ey: -0.24 },
    { el: stg('desk'), in0: 0.875, in1: 0.93, out0: 2, out1: 3, maxZ: 1, drift: 1.06, enterFrom: 1.12, ey: 0.05 },
  ];
  const stages = stageDefs.filter((s): s is Stage => s.el !== null);
  stages.forEach(s => { s.el.style.willChange = 'transform,opacity'; });
  // p-threshold reveals
  const ats = qa('[data-at]').map(el => ({ el, at: parseFloat(el.dataset.at ?? '0'), done: false }));
  const formEl = q('[data-form]');
  let formShown = false;

  // nav → scroll targets
  qa('[data-go]').forEach(a => {
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      const p2 = parseFloat(a.dataset.go ?? '0') || 0;
      scrollTo({ top: p2 * Math.max(1, document.documentElement.scrollHeight - innerHeight), behavior: 'smooth' });
    };
    a.addEventListener('click', onClick);
    cleanups.push(() => { a.removeEventListener('click', onClick); });
  });

  // custom cursor (fine pointers only)
  const fine = mm('(pointer:fine)');
  const c1 = q('[data-cur1]'), c2 = q('[data-cur2]');
  let cx = -100, cy = -100, rx = -100, ry = -100, sc = 1, tSc = 1;
  if (fine) {
    listen('mousemove', e => { cx = e.clientX; cy = e.clientY; });
    listen('mouseover', e => {
      const t = e.target as Element | null;
      tSc = t?.closest('a,button,[data-hov]') ? 2.1 : 1;
    });
  } else {
    if (c1) c1.style.display = 'none';
    if (c2) c2.style.display = 'none';
  }

  // HUD
  const hudScale = q('[data-hudscale]'), hudStatus = q('[data-hudstatus]'), hudBar = q('[data-hudbar]');
  const clouds = q('[data-clouds]'), iris = q('[data-iris]');
  let band = -1;

  // typed terminal
  const codeEl = q('[data-code]');
  let codeN = -1;
  if (codeEl) codeEl.textContent = '';

  // ---------- main loop ----------
  const loop = (now: number) => {
    if (dead) return;
    ssy += (scrollY - ssy) * 0.09;
    smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
    if ((frameC++ % 60) === 0) scrollMax = Math.max(1, document.documentElement.scrollHeight - H);
    const p = clamp(ssy / scrollMax, 0, 1);
    const form = skip ? 1 : clamp((now - t0) / 2300, 0, 1);
    if (counter && !finished) counter.textContent = String(Math.round(form * 100)).padStart(3, '0');
    if (form >= 1 && !finished) finish();

    if (ctx) drawSky(ctx, p, form, now);

    // --- hero out ---
    if (hero) {
      const hp = seg(p, 0, 0.075);
      hero.style.opacity = String(1 - hp);
      hero.style.display = hp >= 1 ? 'none' : 'flex';
      hero.style.pointerEvents = hp > 0.4 ? 'none' : '';
      hLines.forEach((l, i) => { l.style.transform = 'translateY(' + (-hp * (90 + i * 60)).toFixed(1) + 'px)'; });
    }

    // --- stages ---
    for (const s of stages) {
      const active = p > s.in0 - 0.02 && p < s.out1 + 0.02;
      s.el.style.display = active ? 'block' : 'none';
      if (!active) continue;
      const enter = easeIO(seg(p, s.in0, s.in1));
      const hold = seg(p, s.in1, s.out0);
      const exit = easeIO(seg(p, s.out0, s.out1));
      const scale = Math.exp(Math.log(s.enterFrom) * (1 - enter)) * Math.exp(Math.log(s.drift) * hold) * Math.exp(Math.log(s.maxZ) * exit);
      const op = enter * (1 - seg(p, s.out0 + (s.out1 - s.out0) * 0.35, s.out1));
      const ey = (1 - enter) * s.ey * H;
      s.el.style.opacity = op.toFixed(3);
      s.el.style.transform = 'translate(' + (smx * 14).toFixed(1) + 'px,' + (smy * 10 + ey).toFixed(1) + 'px) scale(' + scale.toFixed(4) + ')';
      s.el.style.pointerEvents = op > 0.85 ? 'auto' : 'none';
    }

    // --- p reveals ---
    for (const a of ats) {
      if (!a.done && p >= a.at) {
        a.done = true;
        a.el.style.opacity = '1';
        a.el.style.transform = 'none';
        const t = scrTarget(a.el);
        if (t) scramble(t);
      }
    }

    // --- typed terminal + form ---
    if (codeEl) {
      const tp = seg(p, 0.925, 0.965);
      const n = Math.floor(tp * terminalCode.length);
      if (n !== codeN) { codeN = n; codeEl.textContent = terminalCode.slice(0, n) + (n > 0 && n < terminalCode.length ? '▌' : ''); }
      if (!formShown && tp >= 1 && formEl) { formShown = true; formEl.style.opacity = '1'; formEl.style.transform = 'none'; }
    }

    // --- atmosphere descent + window iris ---
    if (clouds) {
      clouds.style.opacity = (bell(p, 0.645, 0.036) * 0.85).toFixed(3);
      clouds.style.transform = 'translate(' + (Math.sin(now * 0.0004) * 30).toFixed(1) + 'px,' + (72 - 190 * seg(p, 0.585, 0.71)).toFixed(1) + 'vh)';
    }
    if (iris) iris.style.opacity = (bell(p, 0.885, 0.028) * 0.96).toFixed(3);

    // --- HUD ---
    let b = 0;
    while (b < bands.length - 1 && p > bands[b].to) b++;
    if (b !== band) {
      band = b;
      if (hudScale) { hudScale.dataset.txt = bands[b].scale; hudScale.textContent = bands[b].scale; scramble(hudScale, 500); }
      if (hudStatus) { hudStatus.dataset.txt = bands[b].status; hudStatus.textContent = bands[b].status; scramble(hudStatus, 500); }
    }
    if (hudBar) hudBar.style.width = (p * 100).toFixed(1) + '%';

    // --- cursor ---
    if (fine && c1 && c2) {
      rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16; sc += (tSc - sc) * 0.15;
      c1.style.transform = 'translate(' + String(cx - 3) + 'px,' + String(cy - 3) + 'px)';
      c2.style.transform = 'translate(' + String(rx - 18) + 'px,' + String(ry - 18) + 'px) scale(' + sc.toFixed(3) + ')';
    }
    raf = requestAnimationFrame(loop);
  };

  // galaxy → solar system → planet, all on one continuous camera
  const drawSky = (g: CanvasRenderingContext2D, p: number, form: number, now: number) => {
    g.clearRect(0, 0, W, H);
    // camera dives toward a point ON an arm, not the core
    const Z = Math.exp(Math.log(16) * easeIO(seg(p, 0.045, 0.31)));
    const gA = 1 - seg(p, 0.25, 0.32);
    const viewX = W / 2 + smx * 26, viewY = H * 0.52 + smy * 16;
    fTh += 0.00022 + 0.05 / (fr + 60);
    const fwx = viewX + Math.cos(fTh) * fr, fwy = viewY + Math.sin(fTh) * fr * 0.58;
    const mixF = easeIO(seg(p, 0.05, 0.24));
    const fx = viewX + (fwx - viewX) * mixF, fy = viewY + (fwy - viewY) * mixF;
    const farA = 1 - seg(p, 0.82, 0.90);
    if (farA > 0.01) {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#C9D6FF';
      for (const s of FAR) {
        g.globalAlpha = farA * s.a * (0.5 + 0.5 * Math.sin(s.tw + now * 0.001 * s.tws));
        g.fillRect(s.x, s.y - p * 60 * s.sz, s.sz, s.sz);
      }
    }
    if (gA > 0.005 && form > 0.02) {
      g.globalCompositeOperation = 'lighter';
      const fe = ease(clamp((form - 0.2) / 0.8, 0, 1));
      for (const nb of NEB) {
        nb.th += 0.00022 + 0.04 / (nb.r + 60);
        const wx = viewX + Math.cos(nb.th) * nb.r, wy = viewY + Math.sin(nb.th) * nb.r * 0.58;
        const x = viewX + (wx - fx) * Z, y = viewY + (wy - fy) * Z;
        const rad = nb.rad * (0.6 + Z * 0.5);
        if (x < -rad || x > W + rad || y < -rad || y > H + rad) continue;
        g.globalAlpha = gA * fe * 0.9;
        g.drawImage(nb.img, x - rad, y - rad, rad * 2, rad * 2);
      }
      if (fe > 0.01) {
        const cwx = viewX + (viewX - fx) * Z, cwy = viewY + (viewY - fy) * Z;
        const coreR = maxR * 0.42 * (0.5 + Z * 0.4);
        g.globalAlpha = gA * fe;
        g.drawImage(coreImg, cwx - coreR, cwy - coreR * 0.62, coreR * 2, coreR * 1.24);
        g.globalAlpha = gA * fe * 0.8;
        g.drawImage(flareImg, cwx - coreR * 1.9, cwy - coreR * 0.17, coreR * 3.8, coreR * 0.34);
      }
      for (const pt of P) {
        pt.th += 0.00022 + 0.05 / (pt.r + 60);
        const f = ease(clamp((form - pt.d) / 0.5, 0, 1));
        const wx0 = viewX + Math.cos(pt.th) * pt.r, wy0 = viewY + Math.sin(pt.th) * pt.r * 0.58;
        const tx = viewX + (wx0 - fx) * Z, ty2 = viewY + (wy0 - fy) * Z;
        const x0 = pt.sx + W / 2, y0 = pt.sy + H / 2;
        const x = x0 + (tx - x0) * f, y = y0 + (ty2 - y0) * f;
        if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;
        const a = gA * (0.5 + 0.5 * Math.abs(Math.sin(pt.tw + now * 0.001 * pt.tws))) * (0.12 + 0.88 * f);
        if (a < 0.02) continue;
        g.globalAlpha = a;
        const s = Math.min(34, pt.sz * (4 + Z * 1.1));
        g.drawImage(SPR[pt.k], x - s / 2, y - s / 2, s, s);
      }
      g.globalCompositeOperation = 'source-over';
    }
    // sun recedes as orbits expand; the SAME DOM planet rides its orbit the whole way
    const sunVis = seg(p, 0.10, 0.18) * (1 - seg(p, 0.60, 0.66));
    const sysZ = easeIO(seg(p, 0.34, 0.46));
    if (sysZ < 0.02) tAng += 0.0012;
    const oScale = (H * 0.16) * (1 + sysZ * 2.2);
    const oEnd = (H * 0.16) * 3.2;
    if (sunVis > 0.01) {
      g.globalCompositeOperation = 'lighter';
      const grow = Math.pow(seg(p, 0.14, 0.315), 2.2);
      const rec = easeIO(seg(p, 0.315, 0.46));
      const sr = (3 + grow * H * 0.55) * (1 - 0.93 * rec);
      const sunX0 = viewX + (fwx - fx) * Z, sunY0 = viewY + (fwy - fy) * Z;
      // solved backwards from the planet's orbit slot so the slot lands on the planet's resting spot
      const exX = W * AX - Math.cos(tAng) * oEnd * 2, exY = H * AY - Math.sin(tAng) * oEnd * 2 * 0.38;
      const sx2 = sunX0 + (exX - sunX0) * rec, sy2 = sunY0 + (exY - sunY0) * rec;
      const oA = seg(p, 0.32, 0.38) * (1 - seg(p, 0.56, 0.63));
      if (oA > 0.01) {
        g.globalAlpha = oA * 0.5;
        g.strokeStyle = 'rgba(0,229,255,0.35)';
        g.lineWidth = 1;
        for (let oi = 1; oi <= 3; oi++) { g.beginPath(); g.ellipse(sx2, sy2, oScale * oi, oScale * oi * 0.38, 0, 0, TAU); g.stroke(); }
        for (const ob of ORB) {
          ob.a += ob.w;
          const px2 = sx2 + Math.cos(ob.a) * oScale * ob.o, py2 = sy2 + Math.sin(ob.a) * oScale * ob.o * 0.38;
          const prr = ob.s * (1 + sysZ * 1.5);
          g.globalAlpha = oA;
          g.drawImage(ob.img, px2 - prr, py2 - prr, prr * 2, prr * 2);
        }
      }
      g.globalAlpha = sunVis;
      g.drawImage(sunImg, sx2 - sr, sy2 - sr, sr * 2, sr * 2);
      g.globalAlpha = sunVis * 0.7;
      g.drawImage(flareImg, sx2 - sr * 1.7, sy2 - sr * 0.14, sr * 3.4, sr * 0.28);
      g.globalCompositeOperation = 'source-over';
      if (pwrap) {
        const px = sx2 + Math.cos(tAng) * oScale * 2, py = sy2 + Math.sin(tAng) * oScale * 2 * 0.38;
        const s2 = (4 + Math.pow(sysZ, 1.6) * (Rend - 4)) / Rend;
        pwrap.style.transform = 'translate(-50%,-50%) translate(' + (px - W * AX).toFixed(1) + 'px,' + (py - H * AY).toFixed(1) + 'px) scale(' + s2.toFixed(4) + ')';
      }
    } else if (pwrap && p > 0.6) {
      pwrap.style.transform = 'translate(-50%,-50%)';
    }
    // atmosphere-scattered sun in the planet's sky
    const skyA = seg(p, 0.46, 0.52) * (1 - seg(p, 0.60, 0.66));
    if (skyA > 0.01) {
      g.globalCompositeOperation = 'lighter';
      const kr = H * 0.09;
      g.globalAlpha = skyA * 0.9;
      g.drawImage(sunImg, W * 0.16 - kr, H * 0.2 - kr, kr * 2, kr * 2);
      g.globalAlpha = skyA * 0.5;
      g.drawImage(flareImg, W * 0.16 - kr * 2.2, H * 0.2 - kr * 0.18, kr * 4.4, kr * 0.36);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  };

  raf = requestAnimationFrame(loop);

  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    clearInterval(stInt);
    timers.forEach(t => { clearTimeout(t); });
    cleanups.forEach(fn => { fn(); });
    document.body.style.overflow = '';
  };
}
