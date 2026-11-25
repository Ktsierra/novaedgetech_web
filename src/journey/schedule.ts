/**
 * Load-time setup (building the 3D scenes, uploading textures, compiling shaders) shares the main thread with the
 * galaxy forming behind the loader. Done in one go it froze that animation for most of a second, so the work is
 * cut into pieces that take turns with the frames: a few milliseconds of setup after each frame is painted, and
 * never two heavy pieces in the same frame. Every scene asks the same gate, so they queue instead of piling up.
 */

export interface GateEnv {
  now: () => number;
  /** resolves once a frame has been painted (or straight away when none are being shown) */
  frame: () => Promise<void>;
}

export interface Gate {
  /**
   * Between small pieces of work: carries on while this frame's share lasts, otherwise waits for the next frame.
   * `first` jumps the queue: for what is on screen first.
   */
  turn: (first?: boolean) => Promise<void>;
  /** before a piece that can't be split and may be slow (a texture upload, a shader link): starts a frame's share */
  ownFrame: () => Promise<void>;
  /**
   * While nothing on screen is moving (before the galaxy starts to form, and once it has formed and the loader is
   * only waiting for the scenes), most of each frame can go to setup.
   */
  rush: (on: boolean) => void;
}

/** setup work per frame, in ms: a 60 Hz frame is 16.7 ms and the galaxy needs its part of it */
const BUDGET = 8;
/** the share while rushing: the screen still refreshes ~20 times a second */
const RUSH = 40;

interface Waiter { part: number; go: () => void }

export function createGate(env: GateEnv): Gate {
  let opened = -Infinity; // when this frame's share began
  let wait = 0; // how long a frame takes to come round, smoothed
  let rushing = false, serving = false;
  const lanes: Waiter[][] = [[], []];
  // A device whose frames are slow to come round anyway (`wait` well over a 30 fps frame) isn't going to look
  // smooth, and setup would take for ever at 8 ms a frame: its share grows with the wait, so loading takes about
  // as long as it used to
  const budget = () => rushing ? Math.max(RUSH, wait * 2) : Math.max(BUDGET, wait - 25);
  const open = async () => {
    const asked = env.now();
    await env.frame();
    opened = env.now();
    wait += (opened - asked - wait) * 0.25;
  };
  // requests are served in order (the first lane before the other); each one continues in the current frame
  // while `part` of its share is unused
  const serve = async () => {
    serving = true;
    for (;;) {
      const w = lanes[0].shift() ?? lanes[1].shift();
      if (!w) break;
      if (env.now() - opened >= budget() * (rushing ? 1 : w.part)) await open();
      w.go();
      // the next request is only looked at once this one's piece has had its chance to run (a few microtasks on:
      // awaits nest), so the time that piece takes counts against the share
      for (let i = 0; i < 8; i++) await Promise.resolve();
    }
    serving = false;
  };
  const ask = (part: number, lane: number) => new Promise<void>(go => {
    lanes[lane].push({ part, go });
    if (!serving) void serve();
  });
  return {
    turn: (first = false) => ask(1, first ? 0 : 1),
    ownFrame: () => ask(0.25, 1),
    rush: on => { rushing = on; },
  };
}

/** a task of its own, as soon as possible (timers are clamped, and throttled in background tabs) */
const soon = (fn: () => void) => {
  if (typeof MessageChannel !== 'function') { setTimeout(fn, 0); return; }
  const ch = new MessageChannel();
  ch.port1.onmessage = () => { ch.port1.close(); fn(); };
  ch.port2.postMessage(0);
};

const frame = () => new Promise<void>(resolve => {
  let fallback = 0;
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    clearTimeout(fallback);
    resolve();
  };
  const shown = typeof document !== 'undefined' && document.visibilityState === 'visible' && typeof requestAnimationFrame === 'function';
  // a background tab draws no frames: nothing to wait for (or protect), so setup runs at full speed there
  if (!shown) { soon(go); return; }
  // just after the frame is painted, which leaves the rest of the interval before the next one
  requestAnimationFrame(() => { soon(go); });
  // frames can stop while we wait (the tab gets hidden)
  fallback = window.setTimeout(go, 150);
});

const gate = createGate({ now: () => performance.now(), frame });
export const turn = gate.turn;
export const ownFrame = gate.ownFrame;
export const rush = gate.rush;

/**
 * For long loops: check `due()` every so often and `await rest()` when it is, so each piece of the loop only
 * runs for a few milliseconds.
 */
export const pacer = (ms = 4, first = false) => {
  let mark = performance.now();
  return {
    due: () => performance.now() - mark >= ms,
    rest: async () => { await turn(first); mark = performance.now(); },
  };
};
