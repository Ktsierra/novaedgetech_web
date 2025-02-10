/**
 * Converts a hexadecimal color string to a [r, g, b] color array
 *
 * @param {string} hex the hexadecimal color string
 * @returns {number[]} [r, g, b] color array
 */
function hexToRgb(hex : string): number[] {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
}

/**
 * Converts RGB color values to a hexadecimal color string.
 *
 * @param {number} r - The red color value (0-255).
 * @param {number} g - The green color value (0-255).
 * @param {number} b - The blue color value (0-255).
 * @returns {string} The hexadecimal color string.
 */

function rgbToHex(r : number, g: number, b: number ): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function interpolateColor(colorA : string, colorB: string, factor: number) {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return rgbToHex(r, g, b);
}
