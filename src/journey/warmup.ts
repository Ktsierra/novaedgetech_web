import type * as T from 'three';
import { ownFrame, turn } from './schedule';

/** the cheap question first: does this browser have WebGL at all (the real test creates a context) */
export const webglPossible = (v2only = false) =>
  typeof WebGL2RenderingContext !== 'undefined' || (!v2only && typeof WebGLRenderingContext !== 'undefined');

/** settings every scene's renderer shares */
export function tune(renderer: T.WebGLRenderer) {
  // the error check reads each program's logs back from the GPU on first use: several blocking round trips per
  // program. Kept while developing, where a broken shader should say so
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
}

const isLight = (ob: T.Object3D) => (ob as Partial<T.Light>).isLight === true;
const isDrawn = (ob: T.Object3D) => {
  const o = ob as Partial<T.Mesh & T.Points & T.Sprite & T.Line>;
  return o.isMesh === true || o.isPoints === true || o.isSprite === true || o.isLine === true;
};
const materialsOf = (ob: T.Object3D): T.Material[] => {
  const m = (ob as Partial<T.Mesh>).material;
  return m ? (Array.isArray(m) ? m : [m]) : [];
};
const holdsLight = (ob: T.Object3D) => {
  let found = false;
  ob.traverse(o => { if (isLight(o)) found = true; });
  return found;
};
const within = <V>(p: Promise<V>, ms: number) => new Promise<void>(resolve => {
  const t = setTimeout(resolve, ms);
  void p.then(() => undefined, () => undefined).then(() => { clearTimeout(t); resolve(); });
});

/**
 * Hands the GPU every shader program a frame needs without using any of them yet. Resolves with a promise for
 * "all ready", which doesn't block where the browser compiles in the background.
 *
 * `drawFrame` is the scene's real frame (for the city: its whole post-processing chain). It runs once with every
 * draw swapped for a compile, so each program is built for the buffer it will really be drawn into: three keys
 * programs by output colour space, and compiling the city against the canvas built programs that its render
 * targets never used. The real ones were then linked in one long freeze, in the first frame.
 */
async function issuePrograms(renderer: T.WebGLRenderer, scene: T.Scene, cam: T.Camera, drawFrame: () => void, target: T.WebGLRenderTarget | null) {
  // one object at a time first: writing out a program's source is main-thread work too
  for (const part of scene.children) {
    if (holdsLight(part)) continue; // compile() would count its lights twice; the pass below covers it
    await turn();
    renderer.setRenderTarget(target);
    try { renderer.compile(part, cam, scene); } finally { renderer.setRenderTarget(null); }
  }
  await turn();
  // eslint-disable-next-line @typescript-eslint/unbound-method -- put back exactly as it was, a few lines down
  const draw = renderer.render;
  const waits: Promise<unknown>[] = [];
  renderer.render = (ob, camera) => { waits.push(renderer.compileAsync(ob, camera)); };
  try { drawFrame(); } finally { renderer.render = draw; }
  // (bounded: a program that never reports ready must not hold the scene back; its first use just waits instead)
  return { ready: within(Promise.all(waits), 4000) };
}

/**
 * The first draw of an object still costs something: the first use of its program (a blocking wait where the
 * browser can't compile in the background), its buffers going to the GPU, and whatever the graphics driver sets
 * up behind that. This draws the scene one material at a time, on separate frames, so no frame pays for more
 * than one. Everything is put back afterwards.
 */
async function drawInStages(scene: T.Scene, drawFrame: () => void) {
  const parts: { ob: T.Object3D; culled: boolean }[] = [];
  scene.traverse(ob => { if (ob.visible && isDrawn(ob)) parts.push({ ob, culled: ob.frustumCulled }); });
  // hidden, then shown one by one; drawn wherever the camera happens to point
  for (const p of parts) { p.ob.visible = false; p.ob.frustumCulled = false; }
  try {
    await ownFrame();
    drawFrame(); // the frame's own passes, with nothing in the scene
    const seen = new Set<T.Material>();
    for (const p of parts) {
      p.ob.visible = true;
      const mats = materialsOf(p.ob);
      if (mats.every(m => seen.has(m))) continue; // nothing new to link: it rides along with the next draw
      mats.forEach(m => seen.add(m));
      await ownFrame();
      drawFrame();
    }
  } finally {
    for (const p of parts) { p.ob.visible = true; p.ob.frustumCulled = p.culled; }
  }
}

/**
 * Gets a scene onto the GPU a piece per frame while the loader is up: programs compiled, textures uploaded
 * (`uploads`, one per frame), every object drawn once. Callers still render their usual hidden frame afterwards;
 * if anything here fails, that frame does all of it in one go, as it always did.
 */
export async function warmUp(
  renderer: T.WebGLRenderer, scene: T.Scene, cam: T.Camera, drawFrame: () => void,
  uploads: (() => void)[] = [], target: T.WebGLRenderTarget | null = null,
) {
  try {
    const programs = await issuePrograms(renderer, scene, cam, drawFrame, target);
    // the driver compiles while the textures go up
    for (const upload of uploads) { await ownFrame(); upload(); }
    await programs.ready;
    await drawInStages(scene, drawFrame);
  } catch { /* the caller's warm-up frame covers whatever is left */ }
  await ownFrame();
}
