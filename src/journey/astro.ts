/**
 * Low-precision sun and moon positions (Astronomical Almanac / suncalc formulas, good to well under a degree
 * for the sun and ~1° for the moon): the points on Earth where each is directly overhead at a given instant.
 */

export interface SubPoint { lat: number; lon: number }

const D = Math.PI / 180;
const J2000 = 946728000000; // 2000-01-01T12:00Z in ms
const wrap180 = (a: number) => a - 360 * Math.floor((a + 180) / 360);

/** equatorial (RA, dec in degrees) -> the geographic point below it at day number d */
const below = (ra: number, dec: number, d: number): SubPoint => {
  const gmst = 280.46061837 + 360.98564736629 * d; // Greenwich sidereal time, degrees
  return { lat: dec, lon: wrap180(ra - gmst) };
};

export function subPoints(ms: number): { sun: SubPoint; moon: SubPoint } {
  const d = (ms - J2000) / 86400000;
  const e = (23.439 - 0.00000036 * d) * D; // obliquity of the ecliptic

  // sun: mean anomaly + equation of centre -> ecliptic longitude (latitude ~0)
  const g = (357.529 + 0.98560028 * d) * D;
  const L = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D;
  const sun = below(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / D, Math.asin(Math.sin(e) * Math.sin(L)) / D, d);

  // moon: mean longitude, anomaly and argument of latitude -> ecliptic longitude / latitude
  const mL = (218.316 + 13.176396 * d) * D;
  const mM = (134.963 + 13.064993 * d) * D;
  const mF = (93.272 + 13.22935 * d) * D;
  const lon = mL + 6.289 * D * Math.sin(mM), lat = 5.128 * D * Math.sin(mF);
  const ra = Math.atan2(Math.sin(lon) * Math.cos(e) - Math.tan(lat) * Math.sin(e), Math.cos(lon));
  const dec = Math.asin(Math.sin(lat) * Math.cos(e) + Math.cos(lat) * Math.sin(e) * Math.sin(lon));
  return { sun, moon: below(ra / D, dec / D, d) };
}

/** where a body with this sub-point appears from (lat, lon): altitude above the horizon and azimuth
 *  (degrees, clockwise from north) */
export function skyPosition(lat: number, lon: number, body: SubPoint): { alt: number; az: number } {
  const p = lat * D, dec = body.lat * D, H = (lon - body.lon) * D; // local hour angle
  const alt = Math.asin(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H) * Math.cos(dec), Math.cos(p) * Math.sin(dec) - Math.sin(p) * Math.cos(dec) * Math.cos(H));
  return { alt: alt / D, az: (az / D + 360) % 360 };
}
