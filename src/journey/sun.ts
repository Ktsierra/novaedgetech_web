import { turn } from './schedule';
import { makeRenderer, warmUp, webglPossible } from './warmup';

export interface SunView {
  setSize: (w: number, h: number) => void;
  /** x, y, r in CSS pixels (disc radius); alpha 0 hides the layer */
  render: (now: number, x: number, y: number, r: number, alpha: number) => void;
  dispose: () => void;
}

// 3D value noise + fbm, shared by the surface and corona shaders.
// The octave count is a uniform, not a constant, on purpose. These two small shaders were measured taking
// longer to compile on Windows (0.6 s on a GTX 980 in Firefox) than the city's twenty-four together. The likely
// reason: a compiler that knows the loop runs five times unrolls it, and every fbm() call becomes forty copies
// of the hash. Given a count it can't see, it has to keep the loop. Same sums in the same order, so the
// picture is the same (checked pixel for pixel); whether it compiles faster only shows on such a machine.
const OCTAVES = 5;
const NOISE = /* glsl */ `
  uniform int uOctaves;
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < uOctaves; i++){ s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }
`;

const hasWebGL = (canvas: HTMLCanvasElement) => {
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // (a context a previous run lost on purpose when it was disposed is of no use: hot reload, in development)
    return !!gl && !gl.isContextLost();
  } catch {
    return false;
  }
};

/**
 * Procedural star for the galaxy -> solar system leg: granulated, limb-darkened photosphere plus a
 * corona with slow streamers. No textures, so it is ready almost immediately.
 * Drawn in screen space (orthographic, CSS pixels) at whatever position/size the journey engine computes.
 *
 * `w` x `h` is the size it will be shown at (CSS pixels): it is warmed up at that size, so taking it into use
 * asks nothing more of the graphics card. `progress` is told how far along it is: 0.2 once it is built and only the
 * graphics card's part is left, 1 when it is ready.
 */
export async function createSun(canvas: HTMLCanvasElement, w: number, h: number, progress?: (done: number) => void): Promise<SunView> {
  if (!webglPossible() || !hasWebGL(canvas)) throw new Error('WebGL unavailable');
  const THREE = await import('three');
  await turn('sun:build');

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);

  const uTime = { value: 0 }, uOctaves = { value: OCTAVES };

  // ---- photosphere ----
  const surfMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uOctaves },
    vertexShader: `varying vec3 vN; varying vec3 vObj;
      void main(){ vObj = normalize(position); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vObj;
      ${NOISE}
      void main(){
        float t = uTime * 0.04;
        vec3 p = vObj * 5.5;
        // domain-warped fbm reads as convection cells / granulation
        float warp = fbm(p + vec3(t, -t, t * 0.7));
        float g = fbm(p * 2.8 + warp * 1.4 + vec3(0.0, t * 1.4, 0.0));
        float spots = smoothstep(0.62, 0.78, fbm(p * 0.9 - vec3(t * 0.3)));
        float mu = clamp(vN.z, 0.0, 1.0);             // 1 at disc centre, 0 at the limb
        float limb = pow(mu, 0.42);                     // limb darkening
        vec3 deep = vec3(0.92, 0.42, 0.1), mid = vec3(1.0, 0.74, 0.32), hot = vec3(1.0, 0.95, 0.82);
        vec3 c = mix(deep, mid, smoothstep(0.25, 0.65, g));
        c = mix(c, hot, smoothstep(0.55, 0.85, g) * 0.8);
        c *= mix(0.42, 1.12, limb);
        c = mix(vec3(0.85, 0.3, 0.06) * 0.7, c, smoothstep(0.0, 0.55, mu)); // limb reddens
        c *= 1.0 - spots * 0.25;
        c += hot * pow(mu, 6.0) * 0.28;                 // bright core
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), surfMat);
  scene.add(sphere);

  // ---- corona: camera-facing quad (plane spans 4 disc radii either side) ----
  const CORONA = 4;
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uOctaves, uAlpha: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = (uv - 0.5) * 2.0 * ' + CORONA.toFixed(1) + '; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform float uAlpha; varying vec2 vUv;
      ${NOISE}
      void main(){
        float r = length(vUv);
        if (r < 0.98) discard;                           // the disc covers the centre
        float a = atan(vUv.y, vUv.x);
        float t = uTime * 0.05;
        vec3 q = vec3(cos(a) * 1.6, sin(a) * 1.6, r * 0.9 - t);
        float streak = fbm(q * 1.8 + vec3(0.0, 0.0, t * 0.5));
        // (not pow(): fbm goes negative, where GPUs return NaN - a dead dark patch around the sun in Chrome / Safari)
        float ray = max(fbm(vec3(cos(a) * 5.0, sin(a) * 5.0, t * 0.6)), 0.0);
        float rays = ray * ray;
        float e = r - 1.0;
        float inner = exp(-e * 7.0);                      // tight bright rim
        float glow = exp(-e * 1.9) * (0.45 + 0.9 * streak) + rays * exp(-e * 1.1) * 0.6;
        float outer = exp(-e * 0.55) * 0.08;
        float fade = 1.0 - smoothstep(${(CORONA - 0.8).toFixed(1)}, ${CORONA.toFixed(1)}, r);
        vec3 col = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.9, 0.75), inner);
        float k = (inner * 0.9 + glow * 0.42 + outer) * fade * uAlpha;
        gl_FragColor = vec4(col, clamp(k, 0.0, 1.0)); // additive: src * alpha
      }`,
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coronaMat);
  corona.renderOrder = 1;
  scene.add(corona);

  progress?.(0.2);
  // ---- from here on it is the graphics card's work, which waits for a still picture (warmup.ts) ----
  // an OPAQUE black canvas: the layer is screen-blended over the galaxy (black = no change), so the corona is pure
  // added light. A transparent canvas left its soft alpha to each browser's compositor, and Chrome / Safari drew
  // it as a hard-edged sticker
  const renderer = await makeRenderer('sun', () => {
    const r = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    r.setClearColor(0x000000, 1);
    return r;
  });

  let W = 0, H = 0, ratio = 0, t0 = -1, hidden = true;
  const view: SunView = {
    setSize: (cw: number, ch: number) => {
      const pr = Math.min(devicePixelRatio || 1, 1.5);
      if (cw === W && ch === H && pr === ratio) return; // (a resize, even to the same size, is work for the GPU)
      W = cw; H = ch; ratio = pr;
      renderer.setPixelRatio(pr);
      renderer.setSize(cw, ch, false);
      cam.left = 0; cam.right = cw; cam.top = ch; cam.bottom = 0;
      cam.updateProjectionMatrix();
    },
    render: (now: number, x: number, y: number, r: number, alpha: number) => {
      if (alpha < 0.01 || r < 0.3) {
        if (!hidden) { canvas.style.opacity = '0'; hidden = true; }
        return;
      }
      if (hidden) { canvas.style.opacity = '1'; hidden = false; }
      if (t0 < 0) t0 = now;
      uTime.value = (now - t0) / 1000;
      const yy = H - y; // ortho camera has y up
      sphere.position.set(x, yy, 0);
      sphere.scale.setScalar(r);
      sphere.rotation.y = uTime.value * 0.02;
      corona.position.set(x, yy, 1);
      corona.scale.setScalar(r * CORONA);
      coronaMat.uniforms.uAlpha.value = alpha;
      // the disc itself fades by blending the whole layer
      canvas.style.opacity = alpha.toFixed(3);
      renderer.render(scene, cam);
    },
    dispose: () => {
      sphere.geometry.dispose(); corona.geometry.dispose();
      surfMat.dispose(); coronaMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  // warm-up while the loader is up (see warmup.ts): every object drawn once into a small buffer, then one frame
  // at the real size, and the layer is hidden again before anything is painted
  await warmUp('sun', renderer, scene, cam, {
    small: () => { view.setSize(128, 128); },
    frame: () => { renderer.render(scene, cam); },
    progress: done => { progress?.(0.2 + 0.8 * done); },
    real: () => {
      view.setSize(w, h);
      view.render(performance.now(), w / 2, h / 2, 30, 1);
      canvas.style.opacity = '0';
      hidden = true;
      t0 = -1;
    },
  });
  return view;
}
