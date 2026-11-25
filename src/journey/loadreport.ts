import { rendererName } from './warmup';

/**
 * ?loadreport: how one load of the page really went on the device that opened it, as text to copy and send in.
 * The engine keeps the record (every piece of setup work, every frame); this file, loaded only when the report
 * was asked for, turns it into something readable and shows it once the loader has gone.
 */
export interface LoadTrace {
  /** when the journey started, in ms since the page did (as every time in here) */
  start: number;
  /** when the stars start to move */
  t0: number;
  /** when the loader went (0 until then) */
  finished: number;
  /** when the graphics card was given its setup work: only in a still picture (the rule), or as soon as it was ready */
  mode: 'still' | 'early, as asked (?gl=early)' | 'early: a software renderer, with no graphics card to hold up';
  /** every piece of setup work: its name, when it started, how long it ran, whether it was for the graphics card */
  pieces: [string, number, number, boolean][];
  /** every frame, four numbers each: its time, how far the galaxy had formed (0..1), the phase (see PHASES), the counter */
  frames: number[];
  /** frames in which the formed galaxy was left as it was (not redrawn) while the loader waited for the graphics card */
  held: number;
}

const PHASES = ['pre', 'forming', 'settled', 'done'];
const r = (v: number) => String(Math.round(v));
const r1 = (v: number) => v.toFixed(1);

/** the graphics card's name, and whether the browser compiles shaders in the background */
const graphics = () => {
  try {
    for (const sel of ['[data-sun3d]', '[data-earth]', '[data-surface3d]']) {
      const cv = document.querySelector<HTMLCanvasElement>(sel);
      const v2 = cv?.getContext('webgl2');
      const gl = v2 ?? cv?.getContext('webgl');
      if (!gl || gl.isContextLost()) continue;
      return `${rendererName(gl)}, ${v2 ? 'WebGL2' : 'WebGL1'}, background shader compile: ${gl.getExtension('KHR_parallel_shader_compile') ? 'yes' : 'no'}`;
    }
  } catch { /* below */ }
  return 'no WebGL context';
};

function describe(t: LoadTrace, long: [number, number][]): string {
  const n = Math.floor(t.frames.length / 4);
  const at = (i: number) => t.frames[i * 4], phase = (i: number) => t.frames[i * 4 + 2], count = (i: number) => t.frames[i * 4 + 3];
  // the display's own rhythm: dropped frames only ever make a gap longer, so look low in the list
  const gaps: number[] = [];
  for (let i = 1; i < n; i++) gaps.push(at(i) - at(i - 1));
  const tick = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 4)] || 16.7;
  const slow = tick * 1.5 + 2;
  /** the phase the page was in at a given time */
  const phaseAt = (ms: number) => {
    let p = 0;
    for (let i = 0; i < n && at(i) <= ms; i++) p = phase(i);
    return PHASES[p];
  };
  /** setup work that ran between two times: processor ms, graphics card ms, and the piece that took most of it */
  const inside = (a: number, b: number) => {
    let cpu = 0, gpu = 0, top = '', topMs = 0;
    for (const [tag, start, ms, onGpu] of t.pieces) {
      const part = Math.min(b, start + ms) - Math.max(a, start);
      if (part <= 0) continue;
      if (onGpu) gpu += part; else cpu += part;
      if (part > topMs) { topMs = part; top = tag; }
    }
    return cpu + gpu < 0.5 ? 'no setup running' : `setup ${r(cpu)} + gpu ${r(gpu)} ms, mostly ${top} (${r1(topMs)})`;
  };
  const frames = (p: number) => { let k = 0; for (let i = 0; i < n; i++) if (phase(i) === p) k++; return k; };
  // a slow frame belongs to the phase of the picture that stayed on screen (the frame before it)
  const slowIn = (p: number | null) => {
    const out: { i: number; gap: number }[] = [];
    for (let i = 1; i < n; i++) {
      const gap = at(i) - at(i - 1);
      if (gap > slow && (p === null ? phase(i - 1) !== 1 : phase(i - 1) === p)) out.push({ i, gap });
    }
    return out;
  };
  const first = (p: number) => { for (let i = 0; i < n; i++) if (phase(i) >= p) return at(i); return NaN; };
  const moving = slowIn(1), other = slowIn(null).sort((a, b) => b.gap - a.gap);
  /** the longest the counter showed one number during a phase, and that number */
  const stuckIn = (p: number) => {
    let stuck = 0, stuckAt = 0, since = -1, was = -1;
    for (let i = 0; i < n; i++) {
      if (phase(i) !== p) { since = -1; continue; }
      if (since < 0 || count(i) !== was) { since = at(i); was = count(i); }
      if (at(i) - since > stuck) { stuck = at(i) - since; stuckAt = was; }
    }
    return `${r(stuck)} ms (at ${String(stuckAt)})`;
  };
  /** frames, slow frames and the longest gap, phase by phase */
  const byPhase = PHASES.map((name, p) => {
    let slowN = 0, worst = 0;
    for (let i = 1; i < n; i++) {
      if (phase(i - 1) !== p) continue;
      const gap = at(i) - at(i - 1);
      if (gap > slow) slowN++;
      if (gap > worst) worst = gap;
    }
    return `${name} ${String(frames(p))} (${String(slowN)} slow, worst ${r(worst)} ms)`;
  });
  const gpuSteps = t.pieces.filter(p => p[3] && p[2] >= 0.3), cpu = t.pieces.filter(p => !p[3]);
  const sum = (list: [string, number, number, boolean][]) => list.reduce((s, p) => s + p[2], 0);
  const big = gpuSteps.filter(p => p[2] >= 2), longest = [...cpu].sort((a, b) => b[2] - a[2])[0] as typeof cpu[number] | undefined;
  const formed = first(2), mem = (navigator as { deviceMemory?: number }).deviceMemory;
  const hold = gpuSteps.filter(p => p[1] >= formed && p[1] < t.finished);
  const lines = [
    'NovaEdge load report',
    `${new Date().toISOString()}  ${location.pathname}${location.search}`,
    `browser: ${navigator.userAgent}`,
    `screen: ${String(innerWidth)}x${String(innerHeight)} css px, pixel ratio ${String(devicePixelRatio)}, a frame every ${r1(tick)} ms (~${r(1000 / tick)} Hz), ${String(navigator.hardwareConcurrency)} cores${mem ? ', ' + String(mem) + ' GB' : ''}`,
    `graphics: ${graphics()}`,
    `graphics card set up: ${t.mode === 'still' ? 'only while the picture is still' : t.mode}`,
    '',
    `loader: gone at ${r(t.finished)} ms (journey started at ${r(t.start)}, ${String(n)} frames recorded)`,
    `stars: moving from ${r(first(1))} to ${r(formed)} ms, ${String(frames(1))} frames, ${String(moving.length)} slow (worst ${r(Math.max(0, ...moving.map(s => s.gap)))} ms)`,
    `hold on the formed galaxy: ${r(t.finished - formed)} ms, the graphics card busy for ${r(sum(hold))} of them, the galaxy left untouched for ${String(t.held)} frames`,
    `counter: the longest it showed one number while the stars moved: ${stuckIn(1)}; during the hold: ${stuckIn(2)}`,
    `frames by phase: ${byPhase.join(' · ')}`,
    '',
    'slow frames while the stars were moving [at ms, counter, length, what ran inside]:',
    ...(moving.length ? moving.slice(0, 40).map(s => `  ${r(at(s.i - 1))}  ${String(count(s.i - 1))}%  ${r(s.gap)} ms  ${inside(at(s.i - 1), at(s.i))}`) : ['  none']),
    `slow frames at other times: ${String(other.length)}${other.length ? '; the worst:' : ''}`,
    ...other.slice(0, 10).map(s => `  ${r(at(s.i - 1))}  ${PHASES[phase(s.i - 1)]}  ${r(s.gap)} ms  ${inside(at(s.i - 1), at(s.i))}`),
    '',
    `graphics card: ${r(sum(gpuSteps))} ms in ${String(gpuSteps.length)} steps; those over 2 ms [at ms, phase, ms, step]:`,
    ...big.map(p => `  ${r(p[1])}  ${phaseAt(p[1])}  ${r1(p[2])}  ${p[0]}`),
    `processor: ${r(sum(cpu))} ms in ${String(cpu.length)} pieces${longest ? `, longest ${r1(longest[2])} ms (${longest[0]} at ${r(longest[1])}, ${phaseAt(longest[1])})` : ''}`,
    ...cpu.filter(p => p[2] >= 12).slice(0, 12).map(p => `  ${r(p[1])}  ${phaseAt(p[1])}  ${r1(p[2])}  ${p[0]}`),
    `long tasks, by the browser's count: ${long.length ? long.filter(e => e[0] < t.finished + 2500).map(e => `${r(e[0])}+${r(e[1])} ${phaseAt(e[0])}`).join(', ') : 'none (or not reported by this browser)'}`,
  ];
  return lines.join('\n');
}

/** Shows the report in a panel with a copy button. Returns a function that takes it away again. */
export function showLoadReport(t: LoadTrace): () => void {
  const long: [number, number][] = [];
  let watcher: PerformanceObserver | null = null;
  try {
    watcher = new PerformanceObserver(list => { for (const e of list.getEntries()) long.push([e.startTime, e.duration]); });
    watcher.observe({ type: 'longtask', buffered: true });
  } catch { /* not every browser reports them */ }
  const box = document.createElement('div');
  box.setAttribute('data-loadreport', '');
  box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:1000;max-width:760px;margin:0 auto;padding:12px;'
    + 'background:rgba(4,7,14,0.97);color:#dfe7ff;border:1px solid rgba(0,229,255,0.45);border-radius:8px;'
    + 'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:auto;pointer-events:auto;';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
  const title = document.createElement('strong');
  title.textContent = 'Load report';
  title.style.cssText = 'flex:1;letter-spacing:0.08em;';
  const button = (label: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'font:inherit;padding:8px 14px;border-radius:6px;border:1px solid rgba(0,229,255,0.6);background:#062a36;color:#e9fbff;cursor:pointer;';
    return b;
  };
  const copy = button('Copy report'), close = button('Close');
  const pre = document.createElement('pre');
  pre.style.cssText = 'margin:0;max-height:42vh;overflow:auto;white-space:pre-wrap;word-break:break-word;user-select:text;-webkit-user-select:text;';
  pre.textContent = 'gathering...';
  bar.append(title, copy, close);
  box.append(bar, pre);
  document.body.appendChild(box);
  let text = '';
  // (the browser hands over its list of long tasks a moment after it is asked)
  const timer = window.setTimeout(() => {
    watcher?.disconnect();
    text = describe(t, long);
    pre.textContent = text;
    (window as { __loadReport?: string }).__loadReport = text;
  }, 80);
  copy.onclick = () => {
    const done = () => { copy.textContent = 'Copied'; };
    const byHand = () => {
      // no clipboard access: select it, so it can be copied by hand
      const sel = getSelection();
      sel?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(pre);
      sel?.addRange(range);
      copy.textContent = 'Selected: copy it';
    };
    // (there is no clipboard on a page that isn't served over https)
    const clipboard = (navigator as { clipboard?: Clipboard }).clipboard;
    if (clipboard) clipboard.writeText(text).then(done, byHand);
    else byHand();
  };
  const remove = () => { clearTimeout(timer); watcher?.disconnect(); box.remove(); };
  close.onclick = remove;
  return remove;
}
