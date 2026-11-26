/**
 * Load-time setup (building the 3D scenes, uploading textures, compiling shaders) shares the page with the galaxy
 * forming behind the loader. Done in one go it froze that animation for most of a second, so it is cut into
 * pieces, and the two kinds of piece are kept apart:
 *
 * - work for the processor (geometry, noise, building the scene graph) takes turns with the frames: a few
 *   milliseconds after each frame is painted. `turn()`
 * - work for the graphics card (anything that makes a WebGL call) only runs while the picture on screen is
 *   holding still: before the stars start to move, and once they have settled. `gpu()`, inside `pass()`.
 *   The graphics card draws the page too, so whatever it is asked to do delays the next frame, however idle the
 *   main thread is. Spread through the animation that work showed as a stutter; in a still picture a pause
 *   can't be seen.
 *
 * Every scene asks the same gate, so they queue instead of piling up.
 *
 * The gate also knows whether there is anything setup could be getting on with (`atHand()`): the stars wait for
 * that before they start to move, so the graphics card's share is over before there is anything to hold up.
 */

export interface GateEnv {
  now: () => number;
  /** resolves once a frame has been painted (or straight away when none are being shown) */
  frame: () => Promise<void>;
  /** whether frames are being shown at all: a background tab shows none */
  shown: () => boolean;
  /** told about every piece of work once it has run: its name, when it started, how long it took (the load report) */
  note?: (tag: string, at: number, ms: number, gpu: boolean) => void;
}

export interface Gate {
  /**
   * Between small pieces of work: carries on while this frame's share lasts, otherwise waits for the next frame.
   * `tag` names the piece that follows (for the load report); `first` jumps the queue: for what is on screen first.
   */
  turn: (tag?: string, first?: boolean) => Promise<void>;
  /**
   * Before a piece of work for the graphics card: waits until the picture is still, then starts a frame's share
   * (such a piece can't be split and may be slow). `quiet` is for a small piece that nothing is waiting for (a
   * picture that arrived late): it takes the next still moment without asking for one, so nothing on screen
   * stops on its account.
   */
  gpu: (tag?: string, quiet?: boolean) => Promise<void>;
  /** One scene's work on the graphics card at a time: runs `work` once those asked for earlier have finished. */
  pass: <V>(work: () => Promise<V>) => Promise<V>;
  /**
   * While nothing on screen is moving (before the galaxy starts to form, and once it has formed and the loader is
   * only waiting for the scenes), most of each frame can go to setup.
   */
  rush: (on: boolean) => void;
  /** Whether the picture is holding still right now: `gpu()` waits for it. */
  still: (on: boolean) => void;
  /**
   * Whether any setup work is at hand: queued, running, or waiting for a still picture. Not while everything
   * left is waiting for a download. The page uses it to bring the picture to rest when there is work to do, and
   * to let it move again when there isn't.
   */
  working: () => boolean;
  /** A scene's whole setup, from asking for its code to its last step: `atHand()` follows it between its pieces. */
  job: <V>(work: () => Promise<V>) => Promise<V>;
  /** A wait for the network (a download, a chunk of code). Returns the same promise. */
  net: <V>(wait: Promise<V>) => Promise<V>;
  /**
   * Whether setup has anything it could be getting on with: work at the gate, or a job that is between two
   * pieces and not waiting for the network (an image being decoded, say: its next piece is a moment away). Not
   * while all that is left is waiting for a download: how long that takes is anyone's guess.
   */
  atHand: () => boolean;
}

/** setup work per frame, in ms: a 60 Hz frame is 16.7 ms and the galaxy needs its part of it */
const BUDGET = 8;
/** the share while rushing: the screen still refreshes ~20 times a second */
const RUSH = 40;
/** how long work for the graphics card waits for a still picture before going ahead anyway */
const PATIENCE = 6000;

interface Waiter { part: number; tag: string; gpu: boolean; go: () => void }

export function createGate(env: GateEnv): Gate {
  let opened = -Infinity; // when this frame's share began
  let wait = 0; // how long a frame takes to come round, smoothed
  let rushing = false, serving = false;
  let calm = true; // (until the page says its picture is moving)
  let since = -1; // when work for the graphics card first found the picture moving
  let asking = 0, passing = 0; // gpu() calls not yet granted, passes not yet over
  let jobs = 0, fetching = 0; // jobs not yet over, waits for the network not yet over
  let line: Promise<unknown> = Promise.resolve();
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
      const began = env.now();
      w.go();
      // the next request is only looked at once this one's piece has had its chance to run (a few microtasks on:
      // awaits nest), so the time that piece takes counts against the share
      for (let i = 0; i < 8; i++) await Promise.resolve();
      env.note?.(w.tag, began, env.now() - began, w.gpu);
    }
    serving = false;
  };
  const ask = (part: number, lane: number, tag: string, gpu = false) => new Promise<void>(go => {
    lanes[lane].push({ part, tag, gpu, go });
    if (!serving) void serve();
  });
  // nothing to wait for in a background tab (it shows no frames), nor once the wait has gone on too long: a
  // picture that never settles must not keep the scenes from loading
  const clear = () => calm || !env.shown() || (since >= 0 && env.now() - since >= PATIENCE);
  return {
    turn: (tag = '', first = false) => ask(1, first ? 0 : 1, tag),
    gpu: async (tag = '', quiet = false) => {
      // (a quiet piece is not work at hand, and does not run out of patience: it has all the time there is)
      const go = quiet ? () => calm || !env.shown() : clear;
      if (!quiet) asking++;
      try {
        for (;;) {
          if (go()) {
            await ask(0.25, 1, tag, true);
            if (go()) return;
            continue; // the picture started moving while this waited for its turn
          }
          if (!quiet && since < 0) since = env.now();
          await env.frame();
        }
      } finally {
        if (!quiet) asking--;
      }
    },
    pass: work => {
      passing++;
      const run = line.then(work);
      line = run.then(() => { passing--; }, () => { passing--; });
      return run;
    },
    rush: on => { rushing = on; },
    still: on => {
      calm = on;
      if (on) since = -1;
    },
    working: () => serving || asking > 0 || passing > 0,
    job: work => {
      jobs++;
      const over = () => { jobs--; };
      const run = Promise.resolve().then(work);
      run.then(over, over);
      return run;
    },
    net: wait => {
      fetching++;
      const over = () => { fetching--; };
      wait.then(over, over);
      return wait;
    },
    // (one count of waits for all jobs: while any download is on its way, only work that has reached the gate counts)
    atHand: () => serving || asking > 0 || passing > 0 || (jobs > 0 && fetching === 0),
  };
}

/** a task of its own, as soon as possible (timers are clamped, and throttled in background tabs) */
const soon = (fn: () => void) => {
  if (typeof MessageChannel !== 'function') { setTimeout(fn, 0); return; }
  const ch = new MessageChannel();
  ch.port1.onmessage = () => { ch.port1.close(); fn(); };
  ch.port2.postMessage(0);
};

const shown = () => typeof document !== 'undefined' && document.visibilityState === 'visible' && typeof requestAnimationFrame === 'function';

const frame = () => new Promise<void>(resolve => {
  let fallback = 0;
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    clearTimeout(fallback);
    resolve();
  };
  // a background tab draws no frames: nothing to wait for (or protect), so setup runs at full speed there
  if (!shown()) { soon(go); return; }
  // just after the frame is painted, which leaves the rest of the interval before the next one
  requestAnimationFrame(() => { soon(go); });
  // frames can stop while we wait (the tab gets hidden)
  fallback = window.setTimeout(go, 150);
});

type Note = NonNullable<GateEnv['note']>;
let listener: Note | null = null;
/** For the load report (?loadreport): hear about every piece of setup work as it finishes. */
export const record = (fn: Note | null) => { listener = fn; };

const gate = createGate({ now: () => performance.now(), frame, shown, note: (tag, at, ms, gpu) => { listener?.(tag, at, ms, gpu); } });
export const turn = gate.turn;
export const gpu = gate.gpu;
export const pass = gate.pass;
export const rush = gate.rush;
export const still = gate.still;
export const working = gate.working;
export const job = gate.job;
export const net = gate.net;
export const atHand = gate.atHand;

/**
 * For long loops: check `due()` every so often and `await rest()` when it is, so each piece of the loop only
 * runs for a few milliseconds.
 */
export const pacer = (tag = '', ms = 4, first = false) => {
  let mark = performance.now();
  return {
    due: () => performance.now() - mark >= ms,
    rest: async () => { await turn(tag, first); mark = performance.now(); },
  };
};
