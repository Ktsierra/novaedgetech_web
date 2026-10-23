import { describe, it, expect } from 'vitest';
import { subPoints } from '../src/journey/astro';

const at = (iso: string) => subPoints(Date.parse(iso));

describe('subPoints', () => {
  it('puts the sun over the equator at the March equinox', () => {
    expect(Math.abs(at('2024-03-20T03:06:00Z').sun.lat)).toBeLessThan(0.3);
  });

  it('puts the sun over the Tropic of Cancer at the June solstice', () => {
    expect(at('2024-06-20T20:51:00Z').sun.lat).toBeCloseTo(23.44, 0);
  });

  it('puts the sun near Greenwich at noon UTC (within the equation of time)', () => {
    expect(Math.abs(at('2024-04-15T12:00:00Z').sun.lon)).toBeLessThan(5);
  });

  it('puts a full moon opposite the sun', () => {
    // full moon 2024-04-23 23:49Z
    const { sun, moon } = at('2024-04-23T23:49:00Z');
    const offOpposite = Math.abs(((moon.lon - sun.lon + 360) % 360) - 180);
    expect(offOpposite).toBeLessThan(6);
  });

  it('lines the moon up with the sun at the April 2024 total eclipse', () => {
    const { sun, moon } = at('2024-04-08T18:21:00Z');
    expect(Math.abs(moon.lon - sun.lon)).toBeLessThan(3);
    expect(Math.abs(moon.lat - sun.lat)).toBeLessThan(3);
  });
});
