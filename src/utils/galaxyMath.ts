import { Vector3 } from "three";
import { ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN, ARMS, CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST, SPIRAL } from "../constants/galaxy";
import { WAVE_AMPLITUDE, WAVE_MIDPOINT } from "../constants/render";
import * as THREE from "three";
import { starTypes } from "../constants/stars";

export function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

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
    return WAVE_MIDPOINT + Math.sin((time * waveSpeed) + (distance*0.01)) * WAVE_AMPLITUDE;
  }


export const generateObjects = (
  numStars: number,
   cluster: 'center' | 'periphery' | 'arms' | 'stars', 
   generator: (pos: THREE.Vector3) => { position: THREE.Vector3 }) => {
      const objects = [];

      if(cluster === 'center' || cluster === 'stars') {
      for (let i = 0; i < numStars / 4; i++) {
        const pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
        objects.push(generator(pos));
      }
    }

    if(cluster === 'periphery' || cluster === 'stars') {
      for (let i = 0; i < numStars / 4; i++) {
        const pos = new THREE.Vector3(gaussianRandom(0, OUTER_CORE_X_DIST), gaussianRandom(0, OUTER_CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
        objects.push(generator(pos));
      }
    }

    if(cluster === 'arms' || cluster === 'stars') {
      for (let j = 0; j < ARMS; j++) {
        for (let i = 0; i < numStars / 4; i++) {
          const pos = spiral(gaussianRandom(ARM_X_MEAN, ARM_X_DIST), gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS), j * 2 * Math.PI / ARMS);
          objects.push(generator(pos));
        }
      }
    }

      return objects;
    };

export const generateStarType = () => {
      let num = Math.random() * 100.0;
      const pct = starTypes.percentage;
      for (let i = 0; i < pct.length; i++) {
        num -= pct[i];
        if (num < 0) return i;
      }
      return 0;
    };