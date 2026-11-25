import { describe, it, expect } from 'vitest';
import { createGate, turn } from '../src/journey/schedule';

/** a gate on a hand-cranked clock: frames only come when the test says so */
const rig = () => {
  let t = 0;
  const waiting: (() => void)[] = [];
  const gate = createGate({ now: () => t, frame: () => new Promise<void>(res => { waiting.push(res); }) });
  const settle = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
  return {
    gate, settle,
    spend: (ms: number) => { t += ms; },
    /** the next frame is painted `after` ms from now */
    frame: async (after = 0) => { t += after; waiting.shift()?.(); await settle(); },
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
    void (async () => { await gate.turn(); ran.push('small'); spend(3); await gate.ownFrame(); ran.push('slow'); spend(30); await gate.turn(); ran.push('after'); })();
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
    void gate.turn(true).then(() => { ran.push('urgent'); });
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
    void (async () => { for (let i = 0; i < 5; i++) { await gate.ownFrame(); done++; spend(15); } })();
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
    await turn(true);
    expect(true).toBe(true);
  });
});
