import { describe, it, expect } from 'vitest';
import { createGate, gpu, pass, turn } from '../src/journey/schedule';

/** a gate on a hand-cranked clock: frames only come when the test says so */
const rig = () => {
  let t = 0, visible = true;
  const waiting: (() => void)[] = [];
  const notes: [string, number, number, boolean][] = [];
  const gate = createGate({
    now: () => t,
    frame: () => new Promise<void>(res => { waiting.push(res); }),
    shown: () => visible,
    note: (tag, at, ms, onGpu) => { notes.push([tag, at, ms, onGpu]); },
  });
  const settle = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
  return {
    gate, settle, notes,
    spend: (ms: number) => { t += ms; },
    hide: () => { visible = false; },
    /** the next frame is painted `after` ms from now (everything waiting for a frame hears of it) */
    frame: async (after = 0) => { t += after; waiting.splice(0).forEach(go => { go(); }); await settle(); },
  };
};

describe('setup gate', () => {
  it('runs pieces while the frame\'s share lasts, then waits for the next frame', async () => {
    const { gate, spend, frame, settle } = rig();
    let done = 0;
    void (async () => {
      for (let i = 0; i < 4; i++) { await gate.turn(); done++; spend(3); }
    })();
    await settle();
    expect(done).toBe(0); // nothing before the first frame is painted
    await frame();
    expect(done).toBe(3); // 3 + 3 + 3 ms: the third piece started with 6 of the 8 ms used
    await frame();
    expect(done).toBe(4);
  });

  it('gives a slow piece a frame that nothing else has used much of', async () => {
    const { gate, spend, frame, settle } = rig();
    const ran: string[] = [];
    void (async () => { await gate.turn(); ran.push('small'); spend(3); await gate.gpu(); ran.push('slow'); spend(30); await gate.turn(); ran.push('after'); })();
    await settle();
    await frame();
    expect(ran).toEqual(['small']); // 3 ms in: the slow piece waits for its own frame
    await frame();
    expect(ran).toEqual(['small', 'slow']); // and what follows it waits too: the share is spent
    await frame();
    expect(ran).toEqual(['small', 'slow', 'after']);
  });

  it('serves requests in order, the first lane ahead of the rest', async () => {
    const { gate, frame, settle } = rig();
    const ran: string[] = [];
    void gate.turn().then(() => { ran.push('a'); });
    void gate.turn().then(() => { ran.push('b'); });
    void gate.turn('', true).then(() => { ran.push('urgent'); });
    await settle();
    await frame();
    expect(ran).toEqual(['a', 'urgent', 'b']); // `a` was already being served when `urgent` arrived
  });

  it('counts concurrent callers against the same share', async () => {
    const { gate, spend, frame, settle } = rig();
    let pieces = 0;
    const worker = async () => { for (let i = 0; i < 3; i++) { await gate.turn(); pieces++; spend(5); } };
    void worker(); void worker(); void worker();
    await settle();
    await frame();
    expect(pieces).toBe(2); // 5 + 5 ms, whoever they belong to
    await frame();
    expect(pieces).toBe(4);
  });

  it('lets most of a frame go to setup while rushing', async () => {
    const { gate, spend, frame, settle } = rig();
    gate.rush(true);
    let done = 0;
    void (async () => { for (let i = 0; i < 5; i++) { await gate.gpu(); done++; spend(15); } })();
    await settle();
    await frame();
    expect(done).toBe(3); // 15 ms pieces, slow ones included, until 40 ms are used
    gate.rush(false);
    await frame();
    expect(done).toBe(4); // back to one slow piece per frame
    await frame();
    expect(done).toBe(5);
  });

  it('grows the share when frames are slow to come round', async () => {
    const { gate, spend, frame, settle } = rig();
    let done = 0;
    void (async () => { for (;;) { await gate.turn(); done++; spend(20); } })();
    await settle();
    for (let i = 0; i < 20; i++) await frame(120); // a device that needs 120 ms per frame
    const before = done;
    await frame(120);
    expect(done - before).toBeGreaterThan(2); // well over the 8 ms it would get on a fast device
  });

  it('keeps going without frames (a background tab, a test environment)', async () => {
    await turn();
    await turn('', true);
    await pass(async () => { await gpu(); });
    expect(true).toBe(true);
  });
});

describe('work for the graphics card', () => {
  it('waits for the picture to hold still, while other setup carries on', async () => {
    const { gate, spend, frame, settle } = rig();
    gate.still(false);
    const ran: string[] = [];
    void (async () => { await gate.gpu(); ran.push('gpu'); })();
    void (async () => { for (let i = 0; i < 3; i++) { await gate.turn(); ran.push('cpu'); spend(10); } })();
    await settle();
    for (let i = 0; i < 5; i++) await frame(16);
    expect(ran).toEqual(['cpu', 'cpu', 'cpu']); // the stars are moving: nothing for the graphics card
    gate.still(true);
    await frame(16);
    await frame(16);
    expect(ran).toEqual(['cpu', 'cpu', 'cpu', 'gpu']);
  });

  it('does not start a step if the picture began to move while it queued', async () => {
    const { gate, spend, frame, settle } = rig();
    const ran: string[] = [];
    // the picture is still when the step asks, but an earlier piece uses up the frame, and by the next one the
    // stars have started
    void (async () => { await gate.turn(); ran.push('cpu'); spend(10); gate.still(false); })();
    void (async () => { await gate.gpu(); ran.push('gpu'); })();
    await settle();
    for (let i = 0; i < 4; i++) await frame(16);
    expect(ran).toEqual(['cpu']);
    gate.still(true);
    await frame(16);
    await frame(16);
    expect(ran).toEqual(['cpu', 'gpu']);
  });

  it('goes ahead in a background tab, which shows no picture at all', async () => {
    const { gate, frame, settle, hide } = rig();
    gate.still(false);
    let ran = false;
    void (async () => { await gate.gpu(); ran = true; })();
    await settle();
    await frame(16);
    expect(ran).toBe(false);
    hide();
    await frame(16);
    await frame(16);
    expect(ran).toBe(true);
  });

  it('goes ahead anyway when the picture never settles, and stops waiting from then on', async () => {
    const { gate, frame, settle } = rig();
    gate.still(false);
    let ran = 0;
    void (async () => { for (let i = 0; i < 3; i++) { await gate.gpu(); ran++; } })();
    await settle();
    for (let i = 0; i < 50; i++) await frame(100); // 5 s of a moving picture
    expect(ran).toBe(0);
    for (let i = 0; i < 12; i++) await frame(100); // past 6 s
    expect(ran).toBe(3); // one a frame, with no more waiting in between
  });

  it('waits again after the picture has been still and started to move once more', async () => {
    const { gate, frame, settle } = rig();
    gate.still(false);
    let ran = 0;
    void (async () => { await gate.gpu(); ran++; })();
    await settle();
    for (let i = 0; i < 70; i++) await frame(100);
    expect(ran).toBe(1); // (out of patience)
    gate.still(true);
    gate.still(false);
    void (async () => { await gate.gpu(); ran++; })();
    await settle();
    for (let i = 0; i < 20; i++) await frame(100);
    expect(ran).toBe(1); // a fresh wait, not the old one still expired
  });

  it('runs one scene\'s pass at a time, in the order they were asked for', async () => {
    const { gate, frame, settle } = rig();
    const ran: string[] = [];
    const scene = (name: string) => gate.pass(async () => {
      for (let i = 1; i <= 2; i++) { await gate.gpu(); ran.push(name + String(i)); }
      return name;
    });
    const a = scene('a'), b = scene('b');
    void a.then(() => gate.pass(async () => { await gate.gpu(); ran.push('a again'); }));
    await settle();
    for (let i = 0; i < 8; i++) await frame(16);
    expect(ran).toEqual(['a1', 'a2', 'b1', 'b2', 'a again']);
    expect(await b).toBe('b');
  });

  it('carries on with the next pass when one fails', async () => {
    const { gate, frame, settle } = rig();
    const failed = gate.pass(() => Promise.reject(new Error('context lost')));
    let ran = false;
    void gate.pass(async () => { await gate.gpu(); ran = true; });
    await expect(failed).rejects.toThrow('context lost');
    await settle();
    await frame(16);
    expect(ran).toBe(true);
  });

  it('reports each piece with its name, its time and who it was for', async () => {
    const { gate, spend, frame, settle, notes } = rig();
    void (async () => { await gate.turn('build'); spend(3); await gate.gpu('upload'); spend(7); })();
    await settle();
    await frame(16);
    await frame(16);
    expect(notes).toEqual([['build', 16, 3, false], ['upload', 35, 7, true]]); // (16 + 3 ms of building, then 16 to the next frame)
  });
});
