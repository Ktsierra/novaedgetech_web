import { Vector3 } from "three";
import { ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN, ARMS, CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST, SPIRAL } from "../constants/galaxy";
import { WAVE_AMPLITUDE, WAVE_MIDPOINT } from "../constants/render";
import * as THREE from "three";
import { starTypes } from "../constants/stars";

/**
 * Generates a random number following a Gaussian distribution with the given
 * mean and standard deviation.  This uses the Box-Muller transform to generate
 * two independent normally distributed random numbers from two random
 * variables.
 *
 * @param {number} [mean=0] - The mean of the Gaussian distribution.
 * @param {number} [stdev=1] - The standard deviation of the Gaussian distribution.
 * @returns {number} - A random number following the Gaussian distribution.
 */
export function gaussianRandom(mean = 0, stdev = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

/**
 * Clamps the given value to the specified range, ensuring it is within [minimum,
 * maximum].
 *
 * @param value - The value to clamp.
 * @param minimum - The minimum allowed value.
 * @param maximum - The maximum allowed value.
 * @returns A value between minimum and maximum, closest to the given value.
 */
export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Converts a given 3D point to a position on a spiral, influenced by the
 * distance from the origin and the specified offset.
 *
 * @param x - The x coordinate of the point to convert.
 * @param y - The y coordinate of the point to convert.
 * @param z - The z coordinate of the point to convert, left unchanged.
 * @param offset - The angle offset in radians, influencing the spiral phase.
 * @returns A new Vector3 with the converted coordinates.
 */
export function spiral(x: number, y: number, z: number, offset: number) {
  const r = Math.sqrt(x ** 2 + y ** 2);
  let theta = offset;
  theta += x > 0 ? Math.atan(y / x) : Math.atan(y / x) + Math.PI;
  theta += (r / ARM_X_DIST) * SPIRAL;
  return new Vector3(r * Math.cos(theta), r * Math.sin(theta), z);
}

/**
 * Calculates the haze scale factor based on time, distance, and wave speed.
 *
 * @param time - The current time influencing the wave phase.
 * @param distance - The distance affecting the wave offset.
 * @param waveSpeed - The speed at which the wave oscillates.
 * @returns The calculated scale factor for the haze.
 */

export function hazeScale(time: number, distance: number, waveSpeed: number) {
  return WAVE_MIDPOINT + Math.sin((time * waveSpeed) + (distance * 0.01)) * WAVE_AMPLITUDE;
}


/**
 * Generates a set of objects using the given generator function,
 * distributed across the given cluster.
 *
 * If the cluster is 'center', objects are distributed randomly within the
 * central core of the galaxy.
 *
 * If the cluster is 'periphery', objects are distributed randomly within the
 * outer core of the galaxy.
 *
 * If the cluster is 'arms', objects are distributed randomly along the
 * spiral arms of the galaxy.
 *
 * If the cluster is 'stars', objects are distributed randomly across the
 * entire galaxy.
 *
 * The generator function is called with the position of each object, and
 * should return an object with a 'position' property containing the
 * THREE.Vector3 position of the object.
 *
 * @param numStars - The number of objects to generate.
 * @param cluster - The region of the galaxy to generate objects within.
 * @param generator - The function to generate each object.
 * @returns The generated objects.
 */
export const generateObjects = (
  numStars: number,
  cluster: 'center' | 'periphery' | 'arms' | 'stars',
  generator: (pos: THREE.Vector3) => { position: THREE.Vector3 }) => {
  const objects = [];

  if (cluster === 'center' || cluster === 'stars') {
    for (let i = 0; i < numStars / 4; i++) {
      const pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
      objects.push(generator(pos));
    }
  }

  if (cluster === 'periphery' || cluster === 'stars') {
    for (let i = 0; i < numStars / 4; i++) {
      const pos = new THREE.Vector3(gaussianRandom(0, OUTER_CORE_X_DIST), gaussianRandom(0, OUTER_CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
      objects.push(generator(pos));
    }
  }

  if (cluster === 'arms' || cluster === 'stars') {
    for (let j = 0; j < ARMS; j++) {
      for (let i = 0; i < numStars / 4; i++) {
        const pos = spiral(gaussianRandom(ARM_X_MEAN, ARM_X_DIST), gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS), j * 2 * Math.PI / ARMS);
        objects.push(generator(pos));
      }
    }
  }

  return objects;
};

/**
 * Generates a random star type based on the percentages given in starTypes.
 * The return value is the index of the star type in the starTypes arrays.
 *
 * @returns The index of the generated star type.
 */
export const generateStarType = () => {
  let num = Math.random() * 100.0;
  const pct = starTypes.percentage;
  for (let i = 0; i < pct.length; i++) {
    num -= pct[i];
    if (num < 0) return i;
  }
  return 0;
};