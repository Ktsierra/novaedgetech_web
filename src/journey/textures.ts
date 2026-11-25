import type * as T from 'three';

type Three = typeof import('three');

/** an image fetched ahead of time, ready to become a texture */
export interface Picture {
  img: HTMLImageElement;
  /** the same image decoded off the main thread, already flipped the way WebGL wants it (null where unsupported) */
  bitmap: ImageBitmap | null;
}

// uploading an <img> to WebGL decodes it on the main thread, right then (~25 ms per 2k map on a laptop, ~100 ms
// on a phone, and img.decode() doesn't help: that cache isn't the one WebGL reads). createImageBitmap decodes in
// the background. It has to do the vertical flip itself (WebGL's flip switch doesn't apply to bitmaps), and
// older Safari / Firefox ignore that option: so ask for it once on a tiny image and look at the result
const BITMAP = { imageOrientation: 'flipY', premultiplyAlpha: 'none' } as const;
/** 1x2 PNG: a red pixel above a blue one */
const PROBE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADUlEQVR42mP4zwAC/wEIAAH/Bs6pJQAAAABJRU5ErkJggg==';
let flips: Promise<boolean> | undefined;
const flipsBitmaps = () => flips ??= (async () => {
  try {
    if (typeof createImageBitmap !== 'function') return false;
    const bytes = Uint8Array.from(atob(PROBE), c => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), BITMAP);
    const cv = document.createElement('canvas');
    cv.width = 1; cv.height = 2;
    const g = cv.getContext('2d');
    if (!g) return false;
    g.drawImage(bmp, 0, 0);
    bmp.close();
    const d = g.getImageData(0, 0, 1, 2).data;
    return d[0] < 60 && d[2] > 195 && d[4] > 195 && d[6] < 60; // blue is on top now
  } catch {
    return false;
  }
})();

/**
 * Download an image and get it ready for the GPU. `decode: false` skips the background decode: for images with
 * transparency, where browsers disagree about premultiplying a bitmap's alpha.
 */
export async function fetchPicture(url: string, decode = true): Promise<Picture> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('image unavailable: ' + url);
  const blob = await res.blob();
  const src = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => { resolve(im); };
    im.onerror = () => { reject(new Error('image failed to load: ' + url)); };
    im.src = src;
  }).finally(() => { URL.revokeObjectURL(src); });
  const bitmap = decode && await flipsBitmaps() ? await createImageBitmap(blob, BITMAP).catch(() => null) : null;
  return { img, bitmap };
}

export function pictureTexture(THREE: Three, pic: Picture, srgb = false): T.Texture {
  const tex = new THREE.Texture(pic.bitmap ?? pic.img);
  if (pic.bitmap) tex.flipY = false; // flipped when it was decoded
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Put the texture on the GPU now, instead of in the middle of the first frame that draws it. */
export function uploadPicture(renderer: T.WebGLRenderer, tex: T.Texture, pic: Picture) {
  renderer.initTexture(tex);
  if (!pic.bitmap) return;
  // the decoded copy (8 MB for a 2k map) has done its job. The texture keeps the compressed image instead, so
  // three can still rebuild it if the WebGL context is lost and restored
  tex.image = pic.img;
  tex.flipY = true;
  pic.bitmap.close();
  pic.bitmap = null;
}
