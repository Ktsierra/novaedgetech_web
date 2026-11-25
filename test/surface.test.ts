import { describe, it, expect } from 'vitest';
import { heightAt } from '../src/journey/surface';

// the terrain height as it was computed before the flat city floor got its shortcut (noise first, mask last)
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, oct = 5) => {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; }
  return s;
};
const pathX = (z: number) => Math.sin(z * 0.009) * 22 + Math.sin(z * 0.023 + 1.3) * 6;
const reference = (x: number, z: number) => {
  const dx = Math.abs(x - pathX(z));
  const ridge = 1 - Math.abs(fbm(x * 0.011 + 7.1, z * 0.011 - 3.4) * 2 - 1);
  const base = fbm(x * 0.006, z * 0.006, 4);
  const mountains = Math.pow(ridge * 0.75 + base * 0.6, 2.2) * 85;
  const mask = smooth((dx - 150) / 110) * (1 - 0.5 * smooth((-z - 60) / 260));
  return mountains * mask;
};

describe('terrain height', () => {
  it('is unchanged by skipping the noise on the flat city floor', () => {
    let flat = 0, hills = 0;
    for (let x = -400; x <= 400; x += 7.3) {
      for (let z = -500; z <= 300; z += 9.1) {
        const h = heightAt(x, z);
        expect(h).toBe(reference(x, z));
        if (h === 0) flat++; else hills++;
      }
    }
    // the sample covers both: the valley floor and the mountains either side
    expect(flat).toBeGreaterThan(1000);
    expect(hills).toBeGreaterThan(1000);
  });
});
