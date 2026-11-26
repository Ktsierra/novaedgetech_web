import { describe, it, expect } from 'vitest';
import { FORM_MS, PREROLL, START_WAIT, introClock } from '../src/journey/intro';

/** runs the clock frame by frame from the start of the page, with setup at hand until `busyFor` ms have passed */
const run = (busyFor: number, frameMs = 1000 / 60, until = 6000) => {
  let clock = NaN, started = -1;
  for (let now = frameMs; now <= until; now += frameMs) {
    clock = introClock(clock, now - PREROLL, frameMs, now < busyFor);
    if (started < 0 && clock > 0) started = now;
  }
  return { clock, started };
};

describe('when the stars start', () => {
  it('starts them after the pre-roll when there is no setup at hand', () => {
    const { started } = run(0);
    expect(started).toBeGreaterThan(PREROLL);
    expect(started).toBeLessThan(PREROLL + 20);
  });

  it('counts down through the pre-roll whatever setup is doing', () => {
    expect(introClock(NaN, -340, 16, true)).toBe(-340);
    expect(introClock(-340, -324, 16, true)).toBe(-324);
    expect(introClock(-340, -324, 16, false)).toBe(-324);
  });

  it('holds them on the starting line while setup is at hand', () => {
    const { started } = run(1500);
    expect(started).toBeGreaterThanOrEqual(1500);
    expect(started).toBeLessThan(1520); // and not a frame longer
    // on the line the clock reads exactly 0: the picture is the one from before the stars
    expect(introClock(-5, 11, 16, true)).toBe(0);
    expect(introClock(0, 400, 16, true)).toBe(0);
  });

  it('gives up waiting after START_WAIT', () => {
    const { started } = run(60000);
    expect(started).toBeGreaterThanOrEqual(PREROLL + START_WAIT);
    expect(started).toBeLessThan(PREROLL + START_WAIT + 20);
  });

  it('starts them from the beginning, however long the frame before took', () => {
    const frame = 1000 / 60;
    expect(introClock(0, 1500, 400, false)).toBeCloseTo(frame); // the last piece of setup took 400 ms
    expect(introClock(0, START_WAIT + 300, 600, true)).toBeCloseTo(frame); // out of patience, in the middle of the work
    expect(introClock(-20, 380, 400, false)).toBeCloseTo(frame); // a long frame across the end of the pre-roll
    expect(introClock(-6, 10, 16, false)).toBe(10);
    // the first frame of all comes late (a slow device): the same, and it waits like any other
    expect(introClock(NaN, 200, 16, false)).toBeCloseTo(frame);
    expect(introClock(NaN, 200, 16, true)).toBe(0);
  });

  it('never stops them once they have started', () => {
    let clock = introClock(0, 400, 16, false);
    expect(clock).toBeCloseTo(1000 / 60);
    for (let i = 0; i < 10; i++) {
      const next = introClock(clock, 416 + i * 16, 16, true); // setup turns up again: too late
      expect(next).toBeGreaterThan(clock);
      clock = next;
    }
  });

  it('moves with the frames: a long one holds the galaxy for a moment', () => {
    expect(introClock(500, 9999, 16, false)).toBe(516);
    expect(introClock(500, 9999, 700, false)).toBe(750); // (250 at most)
    expect(introClock(500, 9999, 4000, false)).toBe(4500); // the tab was in the background: catch up
  });

  it('starts a page that comes back from the background where it would have been', () => {
    // first frame long after the page started (it loaded in a background tab): no waiting, even with setup at hand
    expect(introClock(NaN, START_WAIT + 800, 16, true)).toBe(START_WAIT + 800);
    // without an intro (reduced motion) the stars "started" long ago
    expect(introClock(NaN, 99999, 16, true)).toBeGreaterThan(FORM_MS);
  });

  it('waits no longer at 30 frames a second than at 165', () => {
    for (const hz of [30, 60, 165]) {
      const { started } = run(1200, 1000 / hz);
      expect(started).toBeGreaterThanOrEqual(1200);
      expect(started).toBeLessThan(1200 + 1000 / hz + 1);
    }
  });
});
