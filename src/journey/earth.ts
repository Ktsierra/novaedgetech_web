import dayUrl from '../assets/earth/earth_atmos_2048.jpg';
import normalUrl from '../assets/earth/earth_normal_2048.jpg';
import specUrl from '../assets/earth/earth_specular_2048.jpg';
import cloudsUrl from '../assets/earth/earth_clouds_1024.png';
import moonUrl from '../assets/earth/moon_1024.jpg';
import lightsUrl from '../assets/earth/earth_lights_2048.jpg';
import { subPoints } from './astro';

import { turn } from './schedule';
import { fetchPicture, pictureTexture, uploadPicture } from './textures';
import { makeRenderer, warmUp, webglPossible } from './warmup';

const D = Math.PI / 180;

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
// while the globe spins freely the sun sits upper-left, matching the sun drawn on the galaxy canvas;
// as it locks onto the visitor the light swings to where the real sun is right now
const SUN_DIR: [number, number, number] = [-0.72, 0.5, 0.48];

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
 * Textured NASA Blue Marble Earth (option 2 from the Earth model handoff), rendered with three.js
 * into its own transparent canvas. three is imported lazily so it never blocks the loader.
 *
 * `size` is the backing-store size it will be shown at (device pixels): it is warmed up at that size, so taking
 * it into use asks nothing more of the graphics card. `built` is called once only the graphics card's part is left.
 */
export async function createEarth(canvas: HTMLCanvasElement, size: number, built?: () => void): Promise<EarthView> {
  if (!webglPossible() || !hasWebGL(canvas)) throw new Error('WebGL unavailable');
  const THREE = await import('three');
  // the maps download (and decode, in the background) while the scene is put together. Not before three has
  // arrived: every scene needs it first, and on a slow connection 1.7 MB of maps would take its bandwidth.
  // The clouds are the one image with transparency: see fetchPicture
  const pending = Promise.all([fetchPicture(dayUrl), fetchPicture(normalUrl), fetchPicture(specUrl), fetchPicture(cloudsUrl, false), fetchPicture(moonUrl), fetchPicture(lightsUrl)]);
  void pending.catch(() => undefined); // (reported where it is awaited, below)

  const pictures = await pending;
  await turn('earth:maps');
  const SRGB = [true, false, false, true, true, true];
  const maps = pictures.map((pic, i) => pictureTexture(THREE, pic, SRGB[i]));
  const [day, normal, spec, clouds, moonTex, lights] = maps;

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
  const surfMat = new THREE.MeshStandardMaterial({
    map: day, normalMap: normal, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: spec, roughness: 1, metalness: 0,
    emissiveMap: lights, emissive: new THREE.Color(0xffc27a), emissiveIntensity: 1.5,
  });
  // city lights (NASA Black Marble) only on the night side, fading in across the terminator
  // (the camera is axis-aligned, so world and view directions coincide)
  const sunDir = new THREE.Vector3(...SUN_DIR).normalize();
  surfMat.onBeforeCompile = sh => {
    sh.uniforms.uSunView = { value: sunDir };
    sh.fragmentShader = 'uniform vec3 uSunView;\n' + sh.fragmentShader
      // the specular map is white on water: glossy oceans (roughness 0.59), matte land (1.0). Mapped here, per
      // pixel, rather than by baking a second 2k texture on the main thread
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = 0.5882 + (1.0 - roughnessFactor) * 0.41;')
      .replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= smoothstep(0.1, -0.2, dot(normalize(vNormal), uSunView));');
  };
  const surface = new THREE.Mesh(surfGeo, surfMat);
  surface.rotation.y = faceY;
  earth.add(surface);
  await turn('earth:clouds');

  const cloudGeo = new THREE.SphereGeometry(1.006, 96, 72);
  cloudGeo.scale(1, POLAR, 1);
  const cloudMat = new THREE.MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false, roughness: 1, metalness: 0 });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  cloudMesh.rotation.y = faceY;
  earth.add(cloudMesh);

  // atmosphere: thin fresnel rim on the globe + a soft halo just outside it, both brighter on the day side
  // `shape` maps facing (|n.z|: 0 at the silhouette, 1 dead-centre) to intensity
  const rimShader = (shape: string, strength: number, side: InstanceType<typeof THREE.Material>['side']) => new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir }, uColor: { value: new THREE.Color(0x58b8ff) } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uSun; uniform vec3 uColor; varying vec3 vN;
      void main(){
        vec3 n = normalize(vN);
        float facing = abs(n.z);
        float k = ${shape};
        // day side brighter; a sun behind the globe still backlights the whole limb
        float lit = max(smoothstep(-0.45, 0.75, dot(n, uSun)), 0.55 * max(0.0, -uSun.z));
        vec3 glow = min(uColor * k * lit * ${strength.toFixed(2)}, vec3(1.0));
        // premultiplied: the glow's own brightness is its coverage, so over the transparent canvas it is a valid
        // faint light (Chrome / Safari drop colour written with zero alpha), never an opaque dark ring
        gl_FragColor = vec4(glow, max(glow.r, max(glow.g, glow.b)));
      }`,
    side,
    transparent: true,
    depthWrite: false,
    // premultiplied additive light: colour AND coverage both add, so a pixel is never brighter than its own alpha
    // (where the rim and halo overlap, alpha composited "over" fell short of the summed colour and Chrome drew
    // garbage). Plain AdditiveBlending wrote full alpha (an opaque black ring across the moon); no alpha at all
    // made Chrome / Safari drop the halo
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  await turn('earth:air');
  const rimMat = rimShader('pow(max(1.0 - facing, 0.0), 3.0)', 1.1, THREE.FrontSide);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.008, 96, 72), rimMat);
  // halo shell: brightest where it meets the globe edge (facing ≈ 0.36 for r = 1.07), fading out to its own silhouette
  const haloMat = rimShader('pow(smoothstep(0.0, 0.36, facing), 2.2)', 0.75, THREE.BackSide);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.07, 96, 72), haloMat);
  scene.add(rim, halo);
  await turn('earth:moon');

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
  // geographic point -> direction in the textured surface's own frame (inverse of its y-rotation per longitude)
  const geoDir = (lat: number, lon: number, out: InstanceType<typeof THREE.Vector3>) => {
    const a = (lon + 90) * D, p = lat * D;
    return out.set(Math.cos(p) * Math.sin(a), Math.sin(p), Math.cos(p) * Math.cos(a));
  };
  const freeSun = sunDir.clone();
  const realSun = new THREE.Vector3(), realMoon = new THREE.Vector3(), swing = new THREE.Quaternion();
  const swingF = new THREE.Quaternion(), lockM = new THREE.Matrix4(), lockY = new THREE.Matrix4();
  let astroAt = -1e9, sub = subPoints(Date.now());
  /** 0..2π: how far to keep turning FORWARD to reach `to` (never the short way back) */
  const ahead = (to: number, from: number) => ((to - from) % TAU + TAU) % TAU;
  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // free-running spin/orbit phases (advance only while unlocked, so leaving a lock resumes without a jump)
  let spinPhase = 0, orbitPhase = 0, lastT = -1;
  // spin + orbit angles when the lock began; the lock then turns onward from here
  let latch: { y: number; ma: number } | null = null;

  built?.();
  // ---- from here on it is the graphics card's work, which waits for a still picture (warmup.ts) ----
  const renderer = await makeRenderer('earth', () => {
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    const maxAniso = r.capabilities.getMaxAnisotropy();
    maps.forEach(tx => { tx.anisotropy = maxAniso; });
    return r;
  });

  let t0 = -1, sizedTo = 0;
  const view: EarthView = {
    setSize: (px: number) => {
      const s = Math.max(2, Math.round(px));
      if (s === sizedTo) return; // (a resize, even to the same size, is work for the GPU)
      sizedTo = s;
      renderer.setPixelRatio(1);
      renderer.setSize(s, s, false);
    },
    setTarget: (lat: number, lon: number) => {
      target = { lat, lon };
      geoDir(lat, lon, dot.position).multiply(new THREE.Vector3(1.014, 1.014 * POLAR, 1.014));
    },
    render: (now: number, focus = 0, scroll = 0) => {
      if (t0 < 0) t0 = now;
      const t = (now - t0) / 1000;
      const dt = lastT < 0 ? 0 : Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      const f = target ? Math.min(1, Math.max(0, focus)) : 0;
      if (f <= 0) {
        // leaving a lock: carry on from exactly where it let go, wherever the lock was entered
        if (latch) { spinPhase = latch.y - faceY - scroll * 9; orbitPhase = latch.ma - scroll * 14 - 2.1; latch = null; }
        spinPhase += dt * 0.018; orbitPhase += dt * 0.11;
      }
      // free motion: slow drift plus scroll, both in the real senses (Earth spins and the Moon orbits
      // counter-clockwise seen from the north)
      const ySpin = faceY + spinPhase + scroll * 9;
      const maOrbit = orbitPhase + scroll * 14 + 2.1;
      if (f > 0 && !latch) latch = { y: ySpin, ma: maOrbit };

      // real sun / moon for this instant (refreshed every few seconds; they move ~0.25°/min), placed for the
      // LOCKED pose (target latitude pitched to the centre, its longitude facing the camera)
      if (now - astroAt > 5000) { astroAt = now; sub = subPoints(Date.now()); }
      let y = ySpin, ma = maOrbit;
      if (target && latch) {
        const yLock = -(target.lon + 90) * D;
        lockM.makeRotationX(target.lat * D).multiply(lockY.makeRotationY(yLock));
        geoDir(sub.sun.lat, sub.sun.lon, realSun).transformDirection(lockM);
        geoDir(sub.moon.lat, sub.moon.lon, realMoon).transformDirection(lockM);
        // moon's true bearing on its ring (ring point = cos(ma)·x̂ − sin(ma)·(0, −sin i, cos i))
        const maTrue = Math.atan2(realMoon.y * Math.sin(MOON_INCL) - realMoon.z * Math.cos(MOON_INCL), realMoon.x);
        // keep turning forward from where the lock began, however far that is (up to a full turn), so the
        // globe never reverses and the moon never jumps; the turn is faster the further it has to go
        y = latch.y + ahead(yLock, latch.y) * f;
        ma = latch.ma + ahead(maTrue, latch.ma) * f;
        // the light swings from the free-spin angle to the real sun: by the dive the visitor's side is
        // genuinely in daylight or night (with city lights)
        swing.setFromUnitVectors(freeSun, realSun);
        sunDir.copy(freeSun).applyQuaternion(swingF.identity().slerp(swing, f));
      } else sunDir.copy(freeSun);
      sun.position.copy(sunDir);

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
      const mz = -Math.sin(ma) * MOON_ORBIT;
      moon.position.set(Math.cos(ma) * MOON_ORBIT, -mz * Math.sin(MOON_INCL), mz * Math.cos(MOON_INCL));
      moon.rotation.y = ma + Math.PI; // tidally locked: same face toward Earth
      renderer.render(scene, cam);
    },
    dispose: () => {
      [...maps, dotTex].forEach(tx => { tx.dispose(); });
      [surfGeo, cloudGeo, rim.geometry, halo.geometry, moonGeo].forEach(g => { g.dispose(); });
      [surfMat, cloudMat, rimMat, haloMat, moonMat, dotMat].forEach(m => { m.dispose(); });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  // warm-up while the loader is up (warmup.ts): shaders compiled, each map uploaded, each object drawn once into
  // a small buffer. Then one hidden frame at the real size, so nothing is left for the first frame that shows
  // the globe
  dot.visible = true;
  await warmUp('earth', renderer, scene, cam, {
    small: () => { view.setSize(256); },
    frame: () => { renderer.render(scene, cam); },
    uploads: maps.map((tex, i) => () => { uploadPicture(renderer, tex, pictures[i]); }),
    real: () => { view.setSize(size); view.render(performance.now(), 0, 0); },
  });
  dot.visible = false;
  t0 = -1; lastT = -1; spinPhase = orbitPhase = 0;
  return view;
}
