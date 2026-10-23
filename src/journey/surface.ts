import moonUrl from '../assets/earth/moon_1024.jpg';
import { compileScene } from './warmup';
import { subPoints, skyPosition } from './astro';
import { buildCity } from './city';

export interface SurfaceView {
  setSize: (w: number, h: number) => void;
  /**
   * descent 0..1: from high above the clouds down to cruising height, pitching up to the horizon.
   * travel 0..1: flying forward along the valley while the work is on screen.
   * aim 0..1: easing the view onto the lit window in the tower ahead (starts while still flying the valley).
   * dolly 0..1: flying up to that window until it fills the view.
   */
  render: (now: number, descent: number, travel: number, mx: number, my: number, aim?: number, dolly?: number) => void;
  /** where the visitor is: the sky (sun, moon, day/twilight/night) follows their real local time */
  setLocation: (lat: number, lon: number) => void;
  /** 0 at night / twilight .. 1 in full daylight (the page uses it to keep copy legible over a bright sky) */
  daylight: () => number;
  dispose: () => void;
}

const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- deterministic value noise ----------
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number, oct = 5) => {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; }
  return s;
};

/** the river the camera flies down meanders gently (keep PATH_GLSL in sync) */
const pathX = (z: number) => Math.sin(z * 0.009) * 22 + Math.sin(z * 0.023 + 1.3) * 6;
const PATH_GLSL = 'float pathX(float z) { return sin(z * 0.009) * 22.0 + sin(z * 0.023 + 1.3) * 6.0; }';
/** the river ends in a basin in front of the tower */
const RIVER_END = -108;
/** flat city floor with the river cut into it, mountains rising past the edges of the city and behind it */
const heightAt = (x: number, z: number) => {
  const dx = Math.abs(x - pathX(z));
  const ridge = 1 - Math.abs(fbm(x * 0.011 + 7.1, z * 0.011 - 3.4) * 2 - 1);
  const base = fbm(x * 0.006, z * 0.006, 4);
  const mountains = Math.pow(ridge * 0.75 + base * 0.6, 2.2) * 80;
  const mask = Math.max(smooth((dx - 185) / 90), smooth((-z - 400) / 60));
  const river = z > RIVER_END ? 2.4 * (1 - smooth((dx - 8.5) / 1.6)) * smooth((z - RIVER_END) / 5) : 0;
  return mountains * mask - river;
};

const hasWebGL = (canvas: HTMLCanvasElement) => {
  try {
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
};

/**
 * The surface of the Earth the journey dived into: a cyan neon night city along a river (see city.ts), a
 * neon survey grid on the ground, mountains around it, a sky dome, stars and the moon. The sky follows the visitor's real local time: sun and moon
 * at their true altitude and bearing, blending night -> twilight -> a hazy, high-altitude day by the sun's height.
 * three is loaded lazily.
 */
export async function createSurface(canvas: HTMLCanvasElement, warmW = 320, warmH = 200): Promise<SurfaceView> {
  if (!hasWebGL(canvas)) throw new Error('WebGL2 unavailable');
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false }); // MSAA lives in the composer
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);

  const fog = new THREE.Fog(0x0b3a52, 60, 470);
  const scene = new THREE.Scene();
  scene.fog = fog;
  const cam = new THREE.PerspectiveCamera(58, 1, 0.5, 1400);

  // sun / moon directions in the scene (updated from the visitor's sky); start with the classic dusk framing
  // SUN is the true direction (lighting, moon phase); SUN_SKY / MOON are where they're drawn: high bodies are
  // eased down into the top of the frame, since the camera looks at the horizon and would never show them
  const SUN = new THREE.Vector3(0.38, 0.05, -1).normalize();
  const SUN_SKY = SUN.clone();
  const MOON = new THREE.Vector3(-0.55, 0.3, -1).normalize();
  const skyHor = new THREE.Vector3(), skyMid = new THREE.Vector3(), skyZen = new THREE.Vector3();

  // ---------- sky ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uSun: { value: SUN_SKY }, uHorizon: { value: skyHor }, uMid: { value: skyMid }, uZenith: { value: skyZen }, uGlow: { value: 1 }, uDay: { value: 0 }, uCity: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uSun; uniform vec3 uHorizon; uniform vec3 uMid; uniform vec3 uZenith; uniform float uGlow; uniform float uDay; uniform float uCity; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
        c = mix(c, uZenith, smoothstep(0.15, 0.6, h));
        float s = max(dot(d, uSun), 0.0);
        // warm horizon glow toward the sun (twilight), halo + disc whenever it's up
        c += vec3(1.0, 0.5, 0.3) * pow(s, 3.0) * 0.4 * uGlow * (1.0 - smoothstep(0.0, 0.45, h));
        float up = smoothstep(-0.03, 0.01, uSun.y);
        c += vec3(1.0, 0.8, 0.6) * pow(s, 90.0) * 0.8 * up;
        c += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, s) * up;
        // the city's cyan glow on the low sky at night
        c += vec3(0.0, 0.075, 0.1) * uCity * (1.0 - smoothstep(0.0, 0.25, h)) * smoothstep(-0.05, 0.0, h);
        // daytime: a white-hot disc with a wide glare
        c += vec3(1.0, 0.96, 0.88) * (pow(s, 24.0) * 0.45 + pow(s, 400.0) * 0.9) * uDay * up;
        c = mix(c, uHorizon * 0.55, smoothstep(0.0, -0.08, h));
        gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), 1.0); // tuned as display values; the passes work in linear
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), skyMat);
  scene.add(sky);

  // ---------- stars ----------
  const STARS = 1200;
  const sp = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const th = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y);
    sp[i * 3] = Math.cos(th) * r * 900; sp[i * 3 + 1] = y * 900; sp[i * 3 + 2] = Math.sin(th) * r * 900;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xc9d6ff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ---------- terrain ----------
  const mobile = innerWidth < 760;
  const SIZE = 800, SEG = mobile ? 170 : 240; // lighter mesh on phones
  const terrGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  terrGeo.rotateX(-Math.PI / 2);
  const pos = terrGeo.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
  const cols = new Float32Array(pos.count * 3);
  const low = new THREE.Color(0x070e18), high = new THREE.Color(0x24405e), snow = new THREE.Color(0x6f8aa6), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) - 100; // terrain extends mostly ahead of the start
    const h = heightAt(x, z);
    pos.setXYZ(i, x, h, z);
    tmp.copy(low).lerp(high, smooth(h / 36));
    tmp.lerp(snow, smooth((h - 40) / 18) * 0.7);
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  terrGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  terrGeo.computeVertexNormals();
  const terrMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
  const terrain = new THREE.Mesh(terrGeo, terrMat);
  scene.add(terrain);

  // neon survey grid draped over the terrain, strongest on the valley floor
  const gridCam = new THREE.Vector3();
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: { uCam: { value: gridCam }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uCam; uniform float uTime; varying vec3 vW;
      void main(){
        vec2 q = vW.xz / 9.0;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        float dist = length(vW.xz - uCam.xz);
        float fade = 1.0 - smoothstep(30.0, 240.0, dist);
        float floorMask = 1.0 - smoothstep(4.0, 26.0, vW.y);
        float pulse = 0.75 + 0.25 * sin(vW.z * 0.08 + uTime * 1.6);
        gl_FragColor = vec4(pow(vec3(0.0, 0.9, 1.0) * line * fade * (0.05 + 0.3 * floorMask) * pulse, vec3(2.2)), 1.0);
      }`,
  });
  const grid = new THREE.Mesh(terrGeo, gridMat);
  scene.add(grid);

  const dotCv = document.createElement('canvas');
  dotCv.width = dotCv.height = 32;
  const dg = dotCv.getContext('2d');
  if (dg) {
    const gr = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = gr; dg.fillRect(0, 0, 32, 32);
  }
  const dotTex = new THREE.CanvasTexture(dotCv);

  // red aviation beacons on a few peaks
  const bp: number[] = [];
  for (let i = 0; i < 160 && bp.length < 14 * 3; i++) {
    const z = -420 + Math.random() * 560, x = pathX(z) + (Math.random() < 0.5 ? -1 : 1) * (190 + Math.random() * 80);
    const h = heightAt(x, z);
    if (h > 26) bp.push(x, h + 2.5, z);
  }
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  const beaconMat = new THREE.PointsMaterial({ size: 3, map: dotTex, color: 0xff5f57, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const beacons = new THREE.Points(beaconGeo, beaconMat);
  scene.add(beacons);

  // the same Moon that orbited the globe, hanging over the far ridges (sunlit side gives it a phase)
  const moonTex = await new THREE.TextureLoader().loadAsync(moonUrl);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  // lit by the REAL sun direction (even below the horizon), so its phase is tonight's; paler by day
  const moonMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { map: { value: moonTex }, uSun: { value: SUN }, uFade: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 uSun; uniform float uFade; varying vec3 vN; varying vec2 vUv;
      void main(){
        float lit = smoothstep(-0.06, 0.14, dot(normalize(vN), uSun));
        vec3 col = texture2D(map, vUv).rgb * (0.02 + 0.72 * lit); // kept under the bloom threshold: a halo, not a flare
        gl_FragColor = vec4(col, uFade * (0.35 + 0.65 * lit));
        #include <colorspace_fragment>
      }`,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(16, 48, 32), moonMat);
  scene.add(moon);

  // ---------- the tower at the end of the valley: the journey ends inside one of its windows ----------
  // the target window is lit with the same gradient as the DOM hand-off panel (.j-handoff) so the swap is invisible
  const COLS = 5, ROWS = 22, CELL = 64;
  const winCv = (target: boolean) => {
    const c = document.createElement('canvas');
    c.width = COLS * CELL; c.height = ROWS * CELL;
    const g = c.getContext('2d');
    if (!g) return c;
    g.fillStyle = '#04070e'; g.fillRect(0, 0, c.width, c.height);
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const x = q * CELL + 7, y = r * CELL + 7, w = CELL - 14, h = CELL - 14;
      const isTarget = target && q === TARGET_COL && r === TARGET_ROW;
      if (isTarget) {
        const gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.75);
        gr.addColorStop(0, '#3fa9cc'); gr.addColorStop(0.45, '#1b6a87'); gr.addColorStop(1, '#0e3a4e');
        g.fillStyle = gr;
      } else {
        const k = hash(q * 7 + (target ? 1 : 3), r * 13);
        // same mix as the city around it: cool white offices, some warm, a little cyan
        g.fillStyle = k < 0.2 ? 'rgba(170,215,255,0.75)' : k < 0.32 ? 'rgba(255,200,140,0.65)' : k < 0.4 ? 'rgba(40,200,255,0.6)' : '#0a1220';
      }
      g.fillRect(x, y, w, h);
    }
    return c;
  };
  const TARGET_COL = 2, TARGET_ROW = 14;
  const TW = 16, TH = 64, TD = 16, TZ = -135;
  const TX = pathX(TZ), TY = heightAt(TX, TZ) - 1;
  const frontTex = new THREE.CanvasTexture(winCv(true));
  const sideTex = new THREE.CanvasTexture(winCv(false));
  [frontTex, sideTex].forEach(tx => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); });
  const towerMat = (tex: InstanceType<typeof THREE.Texture> | null) => new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.7, metalness: 0.25, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: tex ? 1 : 0 });
  const towerMats = [towerMat(sideTex), towerMat(sideTex), towerMat(null), towerMat(null), towerMat(frontTex), towerMat(sideTex)];
  const towerGeo = new THREE.BoxGeometry(TW, TH, TD);
  const tower = new THREE.Mesh(towerGeo, towerMats);
  tower.position.set(TX, TY + TH / 2, TZ);
  scene.add(tower);
  // the hub: neon edges, a crown and an antenna with a beacon, so it reads as the destination from far away
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const neonGeo = new THREE.BoxGeometry(1, 1, 1);
  const neon = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    const m = new THREE.Mesh(neonGeo, neonMat);
    m.position.set(x, y, z); m.scale.set(w, h, d);
    scene.add(m);
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) neon(TX + sx * TW / 2, TY + TH / 2, TZ + sz * TD / 2, 0.35, TH, 0.35);
  for (const sz of [-1, 1]) neon(TX, TY + TH + 0.2, TZ + sz * TD / 2, TW, 0.35, 0.35);
  for (const sx of [-1, 1]) neon(TX + sx * TW / 2, TY + TH + 0.2, TZ, 0.35, 0.35, TD);
  neon(TX, TY + TH + 6, TZ, 0.4, 12, 0.4);
  bp.push(TX, TY + TH + 12.5, TZ);

  // ---------- the city ----------
  const city = await buildCity(THREE, { pathX, pathGlsl: PATH_GLSL, riverEnd: RIVER_END, tower: { x: TX, z: TZ, top: TY + TH + 0.4 }, mobile, fog });
  city.objects.forEach(ob => { scene.add(ob); });

  // post: multisampled render (smooth edges) -> bloom (neon actually glows) -> sRGB output
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: mobile ? 0 : 2 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  bp.push(...city.beacons);
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  // centre of the target window on the front (+z) face
  const WIN = new THREE.Vector3(
    TX - TW / 2 + (TARGET_COL + 0.5) * (TW / COLS),
    TY + TH - (TARGET_ROW + 0.5) * (TH / ROWS),
    TZ + TD / 2,
  );
  const WIN_STAND = new THREE.Vector3(WIN.x, WIN.y, WIN.z + 1.0); // close enough that the window overfills the view

  // ---------- light ----------
  const sunLight = new THREE.DirectionalLight(0xffb27a, 1.5);
  sunLight.position.copy(SUN).multiplyScalar(100);
  const hemi = new THREE.HemisphereLight(0x3d6fa8, 0x04080f, 0.55);
  scene.add(sunLight, hemi);

  // ---------- the visitor's sky ----------
  // palettes: night (moonlit), twilight (blue hour: deep blue overhead, a magenta / amber band at the horizon), day (hazy, high-altitude: darker than a
  // real noon sky so it stays in the site's palette). Sky colours are raw shader values, the rest three Colors.
  const V = (r: number, g: number, b: number) => new THREE.Vector3(r, g, b);
  const PAL = {
    hor: [V(0.001, 0.012, 0.026), V(0.3, 0.16, 0.26), V(0.45, 0.6, 0.72)],
    mid: [V(0.008, 0.035, 0.07), V(0.08, 0.12, 0.3), V(0.2, 0.38, 0.58)],
    zen: [V(0.005, 0.009, 0.026), V(0.025, 0.04, 0.13), V(0.07, 0.17, 0.38)],
  };
  const C = (hex: number) => new THREE.Color(hex);
  const FOG = [C(0x07202e), C(0x2b3356), C(0x7399b8)];
  const KEY = [C(0x8fa8e0), C(0xffb27a), C(0xfff0dc)];
  const HEMI_SKY = [C(0x2c4f80), C(0x3d6fa8), C(0x9cc0e0)], HEMI_GND = [C(0x02050b), C(0x04080f), C(0x1a2128)];
  const mix3 = <T extends { copy: (v: T) => T; lerp: (v: T, k: number) => T }>(out: T, p: T[], twi: number, day: number) =>
    out.copy(p[0]).lerp(p[1], twi).lerp(p[2], day);
  let loc: { lat: number; lon: number } | null = null, skyAt = -1e9, day = 0, twi = 1, starK = 1, aspect = 1;
  const keyDir = new THREE.Vector3(), nightDir = new THREE.Vector3();
  const keyCol = new THREE.Color(), hemiSky = new THREE.Color(), hemiGnd = new THREE.Color();
  /** scene direction for an altitude / bearing (degrees) relative to the way the valley runs */
  const toScene = (alt: number, rel: number, out: InstanceType<typeof THREE.Vector3>) => {
    const e = alt * Math.PI / 180, r = rel * Math.PI / 180;
    return out.set(Math.sin(r) * Math.cos(e), Math.sin(e), -Math.cos(r) * Math.cos(e));
  };
  const updateSky = () => {
    if (!loc) return;
    const sub = subPoints(Date.now());
    const sun = skyPosition(loc.lat, loc.lon, sub.sun), mo = skyPosition(loc.lat, loc.lon, sub.moon);
    // the valley always faces the equator (south in the northern hemisphere), like looking at the sun's daily arc.
    // Drawn positions are a compressed sky map so anything above the horizon stays in frame: the full 360° of
    // bearing fits the view (facing south: east / morning left, midday centre, west / evening right; facing
    // north it's the real mirror image) and 0..90° of altitude maps onto the band up to the top of the frame.
    // Lighting and the moon's phase use the TRUE directions.
    const face = loc.lat >= 0 ? 180 : 0;
    const rel = (az: number) => ((az - face + 540) % 360) - 180;
    const hfov = 2 * Math.atan(Math.tan(29 * Math.PI / 180) * aspect) * 180 / Math.PI;
    const k = hfov * 0.5 * 0.85 / 180;
    // lifts low bodies clear of the valley ridges (18° -> ~10°, 60° -> ~20°), real below the horizon
    const shownAlt = (alt: number) => alt <= 0 ? alt : 22 * Math.pow(Math.sin(alt * Math.PI / 180), 0.7);
    toScene(sun.alt, rel(sun.az), SUN);
    toScene(shownAlt(sun.alt), rel(sun.az) * k, SUN_SKY);
    toScene(shownAlt(mo.alt), rel(mo.az) * k, MOON);
    twi = smooth((sun.alt + 16) / 16); // 0 below -16° (night) .. 1 at sunrise / sunset
    day = smooth((sun.alt - 2) / 14); // 0 at 2° .. 1 above 16°
    starK = (1 - smooth((sun.alt + 8) / 10)) * 0.55; // city light pollution
    mix3(skyHor, PAL.hor, twi, day); mix3(skyMid, PAL.mid, twi, day); mix3(skyZen, PAL.zen, twi, day);
    mix3(fog.color, FOG, twi, day);
    skyMat.uniforms.uGlow.value = twi * (1 - day) * 1.4 + day * 0.25;
    // key light: the sun from twilight on, the moon at night (dimmer, bluish, scaled by how far it's up)
    const moonUp = smooth(mo.alt / 12);
    nightDir.copy(moonUp > 0 ? MOON : toScene(50, 0, nightDir));
    keyDir.copy(nightDir).lerp(SUN, smooth((sun.alt + 10) / 8));
    keyDir.y = Math.max(keyDir.y, 0.06);
    sunLight.position.copy(keyDir.normalize()).multiplyScalar(100);
    mix3(sunLight.color, KEY, twi, day);
    sunLight.intensity = lerp(lerp(0.15 + 0.35 * moonUp, 1.5, twi), 2.3, day);
    mix3(hemi.color, HEMI_SKY, twi, day); mix3(hemi.groundColor, HEMI_GND, twi, day);
    hemi.intensity = lerp(lerp(0.42, 0.55, twi), 1.25, day);
    skyMat.uniforms.uDay.value = day;
    bloom.strength = lerp(0.75, 0.3, day);
    skyMat.uniforms.uCity.value = 1 - day;
    keyCol.copy(sunLight.color).multiplyScalar(sunLight.intensity);
    hemiSky.copy(hemi.color).multiplyScalar(hemi.intensity); hemiGnd.copy(hemi.groundColor).multiplyScalar(hemi.intensity);
    city.setLight(keyDir, keyCol, hemiSky, hemiGnd, 1 - day, skyMid);
    moonMat.uniforms.uFade.value = (1 - 0.55 * day) * smooth((mo.alt + 2) / 4);
  };

  // sky, stars and moon are "at infinity": centre them on whichever camera is drawing, including the river's
  // mirrored reflection camera (centred on the main camera, the reflected sun slid around as you scrolled)
  const atInfinity = (ob: InstanceType<typeof THREE.Object3D>, offset?: InstanceType<typeof THREE.Vector3>, dist = 0) => {
    ob.frustumCulled = false; // culling runs before this hook, against the previous camera's position
    ob.onBeforeRender = (_r, _s, c) => {
      ob.position.copy(c.position);
      if (offset) ob.position.addScaledVector(offset, dist);
      ob.updateMatrixWorld();
    };
  };
  atInfinity(sky); atInfinity(stars); atInfinity(moon, MOON, 620);

  const look = new THREE.Vector3(), cruisePos = new THREE.Vector3(), cruiseDir = new THREE.Vector3(), winDir = new THREE.Vector3();
  let t0 = -1;
  // ---------- adaptive resolution ----------
  // the city is GPU-heavy: if frames run long, render fewer pixels (down to ~half) rather than pinning the GPU;
  // creep back up while there's headroom. Changes are rate-limited so it never oscillates visibly.
  let vw = warmW, vh = warmH, quality = mobile ? 0.85 : 1, ema = 16.7, lastFrame = -1, lastAdjust = 0, longRun = 0, tier = 0;
  const applySize = () => {
    const dpr = Math.max(0.5, Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.25) * quality);
    renderer.setPixelRatio(dpr);
    renderer.setSize(vw, vh, false);
    composer.setPixelRatio(dpr);
    composer.setSize(vw, vh);
    // (bloom keeps its own half-res chain: feeding it a smaller copy made thin neon pop in and out = strobing)
    city.setSize(vw * dpr, vh * dpr);
  };
  const adapt = (now: number) => {
    const dt = lastFrame < 0 ? 16.7 : now - lastFrame;
    lastFrame = now;
    // one long gap is the scene coming back on screen (or a hidden tab); a run of them is a struggling GPU
    if (dt > 250 && ++longRun < 3) return;
    if (dt <= 250) longRun = 0;
    ema += (Math.min(dt, 400) - ema) * 0.08;
    if (now - lastAdjust < 1500) return;
    if (ema > 26 && quality > 0.5) { quality = Math.max(0.5, quality * (ema > 60 ? 0.7 : 0.82)); lastAdjust = now; applySize(); }
    // still struggling at the lowest resolution (weak integrated GPUs): shed the expensive passes, for good
    else if (ema > 30 && quality <= 0.5 && tier < 2) {
      tier++; lastAdjust = now;
      if (tier === 1) city.setReflectEvery(4);
      else bloom.enabled = false;
    }
    else if (ema < 18.5 && quality < 1) { quality = Math.min(1, quality * 1.1); lastAdjust = now + 1500; applySize(); }
  };
  const view: SurfaceView = {
    setSize: (w: number, h: number) => {
      // resizing a canvas (even to the same size) clears it: only when something really changed
      if (w === vw && h === vh && aspect === w / Math.max(1, h)) return;
      vw = w; vh = h;
      applySize();
      cam.aspect = aspect = w / Math.max(1, h);
      cam.updateProjectionMatrix();
      skyAt = -1e9; // re-frame the sun / moon for the new field of view
    },
    setLocation: (lat: number, lon: number) => { loc = { lat, lon }; skyAt = -1e9; },
    daylight: () => day,
    render: (now: number, descent: number, travel: number, mx: number, my: number, aim = 0, dolly = 0) => {
      if (t0 < 0) t0 = now;
      adapt(now);
      const t = (now - t0) / 1000;
      const d = smooth(descent);
      // drop from high above the clouds to cruising height, pitching from straight down to the horizon
      const z = 150 - travel * 190 - d * 30;
      const y = lerp(230, 13, Math.pow(d, 0.85)) + heightAt(pathX(z), z);
      const pitch = lerp(-1.42, -0.1, smooth((descent - 0.15) / 0.85));
      const a = smooth(aim), dl = smooth(dolly);
      // mouse parallax and drift fade out as the camera commits to the window
      const free = 1 - a;
      const yaw = (-mx * 0.12 + Math.sin(t * 0.15) * 0.02) * free;
      cam.position.set(pathX(z) + mx * 4 * free, y - my * 2 * free, z);
      look.set(
        cam.position.x + Math.sin(yaw) * Math.cos(pitch),
        cam.position.y + Math.sin(pitch),
        cam.position.z - Math.cos(yaw) * Math.cos(pitch),
      );
      // blend view DIRECTIONS (not look points: the window is ~60 units away, so lerping points
      // swings the view almost all the way in the first few percent), then dolly up to the window
      if (a > 0 || dl > 0) {
        cruisePos.copy(cam.position);
        cam.position.lerpVectors(cruisePos, WIN_STAND, dl);
        cruiseDir.copy(look).sub(cruisePos).normalize();
        winDir.copy(WIN).sub(cam.position).normalize();
        cruiseDir.lerp(winDir, Math.max(a, dl)).normalize();
        look.copy(cam.position).add(cruiseDir);
      }
      cam.lookAt(look);

      if (now - skyAt > 10000) { skyAt = now; updateSky(); } // the sky moves ~0.25°/min

      starMat.opacity = 0.75 * smooth((descent - 0.4) / 0.6) * starK;
      gridCam.copy(cam.position);
      gridMat.uniforms.uTime.value = t;
      city.update(t, cam.position);
      beaconMat.opacity = 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.2), 3); // a soft pulse (hard blinks flash under bloom)
      composer.render();
    },
    dispose: () => {
      [terrGeo, starGeo, beaconGeo, sky.geometry, moon.geometry, towerGeo, neonGeo].forEach(g => { g.dispose(); });
      [terrMat, gridMat, skyMat, starMat, beaconMat, moonMat, neonMat, ...towerMats].forEach(m => { m.dispose(); });
      city.dispose();
      [dotTex, moonTex, frontTex, sideTex].forEach(tx => { tx.dispose(); });
      composer.dispose(); rt.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  // warm-up while the loader is up (see earth.ts): mid-descent pose so terrain, grid, lights and tower are in view
  await compileScene(renderer, scene, cam);
  view.setSize(warmW, warmH);
  view.render(performance.now(), 0.8, 0.5, 0, 0);
  t0 = -1;
  return view;
}
