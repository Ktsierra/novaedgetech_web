import type * as T from 'three';
import { gpu, pass } from './schedule';

/**
 * Everything a 3D scene asks of the graphics card before it is first shown goes through this file: creating its
 * renderer, compiling its shader programs, uploading its textures, drawing every object once, and one hidden
 * frame at its real size. All of it runs in steps that wait for the picture on screen to hold still
 * (schedule.ts), one scene at a time, and each step sees its work through before the next begins.
 */

/** the cheap question first: does this browser have WebGL at all (the real test creates a context) */
export const webglPossible = (v2only = false) =>
  typeof WebGL2RenderingContext !== 'undefined' || (!v2only && typeof WebGLRenderingContext !== 'undefined');

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

/**
 * The graphics card's name, as far as the browser will say. Chrome and Safari answer with a placeholder unless
 * asked through an extension; Firefox answers directly (and warns in the console about that extension).
 */
export const rendererName = (gl: WebGLRenderingContext | WebGL2RenderingContext) => {
  const plain = String(gl.getParameter(gl.RENDERER));
  if (!/^webkit webgl$/i.test(plain)) return plain;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : plain;
};

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
/**
 * Whether this canvas's WebGL is drawn by the processor instead of a graphics card (no usable card: some virtual
 * machines and remote desktops, page-speed test tools). Asks the canvas for its context, as its scene is about to.
 *
 * It matters twice. Waiting for a still picture protects the frames from a busy graphics card; with no card in
 * use there is nothing to protect, and the wait would only make the loader longer. And "seeing a step through"
 * (below) would have the page wait for drawing that takes seconds on a processor, where it otherwise runs in the
 * background.
 */
export const softwareRendered = (canvas: HTMLCanvasElement) => {
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return !!gl && SOFTWARE.test(rendererName(gl));
  } catch {
    return false;
  }
};

const PIXEL = new Uint8Array(4);
const onCard = new WeakMap<T.WebGLRenderer, boolean>();
/**
 * A WebGL call returning only means the work was queued. The graphics process gets to it later, and whatever is
 * still queued then delays the frames that follow: the stars would start moving, or the loader start fading,
 * on top of a backlog. So a step waits here until it is really over, and the time it took is its real cost:
 * asking for an answer makes the graphics process take in everything sent so far, and after drawing (`drew`)
 * reading one pixel back makes the card finish the picture as well.
 *
 * Not with a software renderer, where the work is left to run in the background: see softwareRendered.
 */
const settle = (renderer: T.WebGLRenderer, drew: boolean) => {
  if (!onCard.get(renderer)) return;
  const gl = renderer.getContext();
  if (drew) {
    renderer.setRenderTarget(null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PIXEL);
  } else gl.getError();
};

/** One step of work for the graphics card: waits for a still picture, does the work, sees it through. */
const step = async (renderer: T.WebGLRenderer, tag: string, work: () => void, drew = false) => {
  await gpu(tag);
  work();
  settle(renderer, drew);
};

/**
 * Creates a scene's renderer: work for the graphics card like the rest (three sets the context up and asks it
 * what it can do). `create` should also make every call that configures the context.
 */
export const makeRenderer = (tag: string, create: () => T.WebGLRenderer) => pass(async () => {
  await gpu(tag + ':renderer');
  const renderer = create();
  // the error check reads each program's logs back from the GPU on first use: several blocking round trips per
  // program. Kept while developing, where a broken shader should say so
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  onCard.set(renderer, !softwareRendered(renderer.domElement));
  settle(renderer, false);
  return renderer;
});

/**
 * Hands the GPU every shader program a frame needs without using any of them yet, and returns their materials.
 *
 * `drawFrame` is the scene's real frame (for the city: its whole post-processing chain). It runs once with every
 * draw swapped for a compile, so each program is built for the buffer it will really be drawn into: three keys
 * programs by output colour space, and compiling the city against the canvas built programs that its render
 * targets never used. The real ones were then linked in one long freeze, in the first frame.
 */
async function issuePrograms(tag: string, renderer: T.WebGLRenderer, scene: T.Scene, cam: T.Camera, drawFrame: () => void, target: T.WebGLRenderTarget | null) {
  const mats = new Set<T.Material>();
  const compile = (ob: T.Object3D, camera: T.Camera, within?: T.Scene) => { renderer.compile(ob, camera, within).forEach(m => mats.add(m)); };
  // one object at a time first: writing out a program's source is main-thread work too
  let n = 0;
  for (const part of scene.children) {
    if (holdsLight(part)) continue; // compile() would count its lights twice; the pass below covers it
    await step(renderer, `${tag}:programs ${String(++n)}`, () => {
      renderer.setRenderTarget(target);
      try { compile(part, cam, scene); } finally { renderer.setRenderTarget(null); }
    });
  }
  await step(renderer, tag + ':programs', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- put back exactly as it was, a few lines down
    const draw = renderer.render;
    renderer.render = (ob, camera) => { compile(ob, camera); };
    try { drawFrame(); } finally { renderer.render = draw; }
  });
  return mats;
}

/**
 * Where the browser compiles programs in the background (and says so), wait for it to finish instead of letting
 * each program's first draw block on it. Asking is a WebGL call as well, so the asking waits for a still picture
 * too.
 */
async function whenCompiled(tag: string, renderer: T.WebGLRenderer, mats: Set<T.Material>) {
  // (bounded: a program that never reports ready must not hold the scene back; its first draw just waits instead)
  const limit = performance.now() + 4000;
  const compiled = () => {
    for (const m of mats) {
      const program = (renderer.properties.get(m) as { currentProgram?: { isReady: () => boolean } }).currentProgram;
      if (program && !program.isReady()) return false;
    }
    return true;
  };
  for (;;) {
    await gpu(tag + ':compiled?');
    if (compiled() || performance.now() > limit) return;
    await new Promise(resolve => { setTimeout(resolve, 10); });
  }
}

/**
 * The first draw of an object still costs something: the first use of its program (a blocking wait where the
 * browser can't compile in the background), its buffers going to the GPU, and whatever the graphics driver sets
 * up behind that. This draws the scene one material at a time, a step each, so no step is longer than it has to
 * be: the picture is still while they run, but the page may already be in use (a scene that arrives late).
 * Everything is put back afterwards.
 */
async function drawInStages(tag: string, renderer: T.WebGLRenderer, scene: T.Scene, drawFrame: () => void) {
  const parts: { ob: T.Object3D; culled: boolean }[] = [];
  scene.traverse(ob => { if (ob.visible && isDrawn(ob)) parts.push({ ob, culled: ob.frustumCulled }); });
  // hidden, then shown one by one; drawn wherever the camera happens to point
  for (const p of parts) { p.ob.visible = false; p.ob.frustumCulled = false; }
  try {
    await step(renderer, tag + ':draw nothing', drawFrame, true); // the frame's own passes, with nothing in the scene
    const seen = new Set<T.Material>();
    let n = 0;
    for (const p of parts) {
      p.ob.visible = true;
      const mats = materialsOf(p.ob);
      if (mats.every(m => seen.has(m))) continue; // nothing new to link: it rides along with the next draw
      mats.forEach(m => seen.add(m));
      await step(renderer, `${tag}:draw ${String(++n)} ${mats[0].type}`, drawFrame, true);
    }
  } finally {
    for (const p of parts) { p.ob.visible = true; p.ob.frustumCulled = p.culled; }
  }
}

export interface WarmUp {
  /** sizes the scene's buffers small, for the staged draws */
  small: () => void;
  /** draws the scene's real frame into whatever size is set */
  frame: () => void;
  /** texture uploads, a step each */
  uploads?: (() => void)[];
  /** what the scene itself is drawn into, when that isn't the canvas */
  target?: T.WebGLRenderTarget | null;
  /** sizes the scene for the page and draws its first real frame, hidden */
  real: () => void;
}

/**
 * Gets a scene onto the GPU while the picture is still: programs compiled, textures uploaded, every object drawn
 * once into small buffers, then the hidden frame at the size the page will show it at, so nothing is left for
 * the first frame that shows the scene. If any of the earlier steps fails, that last frame does all of it in one
 * go, as it always did.
 */
export async function warmUp(tag: string, renderer: T.WebGLRenderer, scene: T.Scene, cam: T.Camera, w: WarmUp) {
  let mats: Set<T.Material> | null = null;
  // every scene hands its programs over before any of them goes on to upload and draw: where the browser compiles
  // in the background, the biggest scene's programs are then compiling while the others finish
  await pass(async () => {
    try {
      await step(renderer, tag + ':size', w.small);
      mats = await issuePrograms(tag, renderer, scene, cam, w.frame, w.target ?? null);
    } catch { /* the hidden frame below covers whatever is left */ }
  });
  await pass(async () => {
    try {
      let n = 0;
      for (const upload of w.uploads ?? []) await step(renderer, `${tag}:upload ${String(++n)}`, upload);
      if (mats) await whenCompiled(tag, renderer, mats);
      await drawInStages(tag, renderer, scene, w.frame);
    } catch { /* as above */ }
    await step(renderer, tag + ':frame', w.real, true);
  });
}
