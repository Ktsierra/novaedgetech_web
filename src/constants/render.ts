export const STAR_MIN = 0.25;
export const STAR_MAX = 5.0;
export const HAZE_MAX = 50.0;
export const HAZE_MIN = 20.0;
export const HAZE_OPACITY = 0.05;
export const BASE_LAYER = 0;
export const BLOOM_LAYER = 1;
export const OVERLAY_LAYER = 2;
export const BLOOM_PARAMS = {
  exposure: 1,
  bloomStrength: 1.5,
  bloomThreshold: 0.4,
  bloomRadius: 0
};
export const WAVE_AMPLITUDE = (HAZE_MAX - HAZE_MIN) / 2;
export const WAVE_MIDPOINT = (HAZE_MAX + HAZE_MIN) / 2;
