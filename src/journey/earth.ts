import dayUrl from '../assets/earth/earth_atmos_2048.jpg';
import normalUrl from '../assets/earth/earth_normal_2048.jpg';
import specUrl from '../assets/earth/earth_specular_2048.jpg';
import cloudsUrl from '../assets/earth/earth_clouds_1024.png';
import moonUrl from '../assets/earth/moon_1024.jpg';

const D = Math.PI / 180;

import { compileScene } from './warmup';

export interface EarthView {
  /** backing-store size in device pixels (the canvas CSS size is set by Journey.css) */
  setSize: (px: number) => void;
  /** focus 0 = free spin, 1 = target location locked dead-centre */
  /** scroll progress 0..1 also turns the globe and moon, so scrolling always shows motion */
  render: (now: number, focus?: number, scroll?: number) => void;
  /** location to turn toward (and mark) as focus rises */
  setTarget: (lat: number, lon: number) => void;
  dispose: () => void;
}

/** half-width of the canvas in globe radii: room for the atmosphere and the moon's orbit (matches .j-earth inset) */
export const EARTH_FRAME = 2.05;
/** moon orbit radius in globe radii; matches the 168%-wide HUD ring (.j-planet-ring) */
const MOON_ORBIT = 1.68;
/** the HUD ring is rotateX(72deg), i.e. seen 18° above its plane */
const MOON_INCL = 18 * D;
const MOON_R = 0.273; // true Moon/Earth size ratio

const TILT = 23.44 * D;
const FACE_LON = -80; // the Americas face the camera
const TAU = Math.PI * 2;
const POLAR = 6.3567523142 / 6.378137; // WGS84 flattening
// sun sits upper-left of the planet, matching the sun drawn on the galaxy canvas
const SUN_DIR: [number, number, number] = [-0.72, 0.5, 0.48];

const hasWebGL = (canvas: HTMLCanvasElement) => {
  try {
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/**
 * Textured NASA Blue Marble Earth (option 2 from the Earth model handoff), rendered with three.js
 * into its own transparent canvas. three is imported lazily so it never blocks the loader.
 */
export async function createEarth(canvas: HTMLCanvasElement): Promise<EarthView> {
  if (!hasWebGL(canvas)) throw new Error('WebGL unavailable');
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const loader = new THREE.TextureLoader();
  const load = async (url: string, srgb = false) => {
    const t = await loader.loadAsync(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };
  const [day, normal, spec, clouds, moonTex] = await Promise.all([load(dayUrl, true), load(normalUrl), load(specUrl), load(cloudsUrl, true), load(moonUrl, true)]);

  // specular map (white = water) -> roughness map: glossy oceans, matte land
  const toRoughness = (tex: InstanceType<typeof THREE.Texture>) => {
    const img = tex.image as HTMLImageElement;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d');
    if (!g) return null;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const v = 150 + (255 - a[i + 1]) * 0.41; a[i] = a[i + 1] = a[i + 2] = v; }
    g.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = maxAniso;
    return t;
  };
  const rough = toRoughness(spec);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-EARTH_FRAME, EARTH_FRAME, EARTH_FRAME, -EARTH_FRAME, 0.1, 10);
  cam.position.set(0, 0, 5);

  const sun = new THREE.DirectionalLight(0xfff4e6, 3.1);
  sun.position.set(...SUN_DIR);
  scene.add(sun, new THREE.AmbientLight(0x6f8cff, 0.05));

  const LOOK_DOWN = 0.22;
  const earth = new THREE.Group();
  earth.rotation.set(LOOK_DOWN, 0, -TILT); // slight look-down + axial tilt
  scene.add(earth);

  const faceY = -(FACE_LON + 90) * D;
  const surfGeo = new THREE.SphereGeometry(1, 128, 96);
  surfGeo.scale(1, POLAR, 1);
  const surfMat = new THREE.MeshStandardMaterial({ map: day, normalMap: normal, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: rough, roughness: 1, metalness: 0 });
  const surface = new THREE.Mesh(surfGeo, surfMat);
  surface.rotation.y = faceY;
  earth.add(surface);

  const cloudGeo = new THREE.SphereGeometry(1.006, 96, 72);
  cloudGeo.scale(1, POLAR, 1);
  const cloudMat = new THREE.MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false, roughness: 1, metalness: 0 });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.rotation.y = faceY;
  earth.add(cloudMesh);

  // atmosphere: thin fresnel rim on the globe + a soft halo just outside it, both brighter on the day side
  const sunView = new THREE.Vector3(...SUN_DIR).normalize();
  // `shape` maps facing (|n.z|: 0 at the silhouette, 1 dead-centre) to intensity
  const rimShader = (shape: string, strength: number, side: InstanceType<typeof THREE.Material>['side']) => new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunView }, uColor: { value: new THREE.Color(0x58b8ff) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uSun; uniform vec3 uColor; varying vec3 vN;
      void main(){
        vec3 n = normalize(vN);
        float facing = abs(n.z);
        float k = ${shape};
        float lit = smoothstep(-0.45, 0.75, dot(normalize(n.xy + 1e-5), normalize(uSun.xy)));
        gl_FragColor = vec4(uColor * k * lit * ${strength.toFixed(2)}, 1.0);
      }`,
    side,
    transparent: true,
    depthWrite: false,
    // additive light that leaves the canvas ALPHA untouched: plain AdditiveBlending also writes alpha,
    // which turned the faint outer halo into an opaque black ring that cut across the moon
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const rimMat = rimShader('pow(1.0 - facing, 3.0)', 1.1, THREE.FrontSide);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.008, 96, 72), rimMat);
  // halo shell: brightest where it meets the globe edge (facing ≈ 0.36 for r = 1.07), fading out to its own silhouette
  const haloMat = rimShader('pow(smoothstep(0.0, 0.36, facing), 2.2)', 0.75, THREE.BackSide);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.07, 96, 72), haloMat);
  scene.add(rim, halo);

  // moon on an inclined orbit: passes in front of the globe, and behind it (depth-tested)
  const moonGeo = new THREE.SphereGeometry(MOON_R, 64, 48);
  const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1, metalness: 0 });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  scene.add(moon);

  // "you are here" marker: sits just above the clouds, fades in as the globe turns to it
  const dotCv = document.createElement('canvas');
  dotCv.width = dotCv.height = 64;
  const dg = dotCv.getContext('2d');
  if (dg) {
    const gr = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(0,229,255,1)');
    gr.addColorStop(0.45, 'rgba(0,229,255,0.35)');
    gr.addColorStop(1, 'rgba(0,229,255,0)');
    dg.fillStyle = gr;
    dg.fillRect(0, 0, 64, 64);
  }
  const dotTex = new THREE.CanvasTexture(dotCv);
  const dotMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const dot = new THREE.Sprite(dotMat);
  dot.visible = false;
  surface.add(dot);

  let target: { lat: number; lon: number } | null = null;
  const wrapPi = (a: number) => a - TAU * Math.round(a / TAU);
  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  let t0 = -1;
  const view: EarthView = {
    setSize: (px: number) => {
      const s = Math.max(2, Math.round(px));
      renderer.setPixelRatio(1);
      renderer.setSize(s, s, false);
    },
    setTarget: (lat: number, lon: number) => {
      target = { lat, lon };
      const a = (lon + 90) * D, p = lat * D, rr = 1.014;
      // inverse of the surface's y-rotation for this longitude, so the dot lands on the location
      dot.position.set(rr * Math.cos(p) * Math.sin(a), rr * POLAR * Math.sin(p), rr * Math.cos(p) * Math.cos(a));
    },
    render: (now: number, focus = 0, scroll = 0) => {
      if (t0 < 0) t0 = now;
      const t = (now - t0) / 1000;
      const f = target ? Math.min(1, Math.max(0, focus)) : 0;
      // free spin, blended along the shortest arc toward the target longitude
      const spin = faceY + t * 0.018 + scroll * 9;
      const y = target ? spin + wrapPi(-(target.lon + 90) * D - spin) * f : spin;
      surface.rotation.y = y;
      cloudMesh.rotation.y = y + t * 0.006;
      // straighten the axial tilt and pitch the target latitude to the centre
      earth.rotation.x = LOOK_DOWN + ((target ? target.lat * D : LOOK_DOWN) - LOOK_DOWN) * f;
      earth.rotation.z = -TILT * (1 - f);
      if (target) {
        dotMat.opacity = smooth(0.35, 0.9, f);
        dot.visible = dotMat.opacity > 0.01;
        dot.scale.setScalar(0.05 * (1 + 0.25 * Math.sin(t * 4)));
      }
      const ma = t * 0.11 + scroll * 14 + 2.1;
      const mz = Math.sin(ma) * MOON_ORBIT;
      moon.position.set(Math.cos(ma) * MOON_ORBIT, -mz * Math.sin(MOON_INCL), mz * Math.cos(MOON_INCL));
      moon.rotation.y = -ma + Math.PI; // tidally locked
      renderer.render(scene, cam);
    },
    dispose: () => {
      [day, normal, spec, clouds, moonTex, rough, dotTex].forEach(tx => tx?.dispose());
      [surfGeo, cloudGeo, rim.geometry, halo.geometry, moonGeo].forEach(g => { g.dispose(); });
      [surfMat, cloudMat, rimMat, haloMat, moonMat, dotMat].forEach(m => { m.dispose(); });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  // warm-up while the loader is up: compile shaders and render one hidden frame (uploads textures),
  // so the first on-screen frame doesn't hitch mid-scroll
  dot.visible = true;
  await compileScene(renderer, scene, cam);
  view.setSize(256);
  view.render(performance.now(), 0, 0);
  dot.visible = false;
  t0 = -1;
  return view;
}
