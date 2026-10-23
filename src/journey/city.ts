import type * as T from 'three';

type Three = typeof import('three');

/**
 * Cyan neon night city along the river the camera flies down: ~2k procedural buildings in ONE instanced draw
 * (windows, neon crowns / edges, storefronts and animated river-facing signs are all drawn in the shader),
 * a reflective river, street + airborne traffic, street lamps, and the network layer: data packets arcing
 * between rooftops with the destination tower as the hub. Everything reads day / night from setLight().
 */
export interface CityOpts {
  pathX: (z: number) => number;
  /** terrain height (the city floor is flat; hills / mountains rise past FLAT from the river) */
  heightAt: (x: number, z: number) => number;
  /** the same centreline as pathX, in GLSL (`float pathX(float z)`) */
  pathGlsl: string;
  /** z where the river ends in the tower basin */
  riverEnd: number;
  tower: { x: number; z: number; top: number };
  mobile: boolean;
  fog: T.Fog;
}

export interface City {
  objects: T.Object3D[];
  /** rooftop beacon positions (x, y, z triplets) for the tallest buildings */
  beacons: number[];
  /**
   * key light direction + colour·intensity, hemisphere sky / ground colour·intensity, 0 (day) .. 1 (night),
   * raw sky colour mirrored by glass in daylight
   */
  setLight: (keyDir: T.Vector3, key: T.Color, sky: T.Color, ground: T.Color, night: number, skyRaw: T.Vector3) => void;
  update: (t: number, cam: T.Vector3) => void;
  /** scale the river reflection's resolution (lowered when the device struggles; it still refreshes every frame) */
  setReflectScale: (k: number) => void;
  /**
   * drawing-buffer size in device pixels, plus the full-quality size the reflection is sized from (so adaptive
   * resolution steps never resize, and so blank, the reflection buffer)
   */
  setSize: (w: number, h: number, baseW: number, baseH: number) => void;
  dispose: () => void;
}

const CELL = 15, STREET = 4, BANK = 15, RIVER_W = 10.5, WATER_Y = -0.35;
/** dense riverside city out to FLAT (m from the river); sparse hillside buildings out to HILLS */
const FLAT = 75, HILLS = 260, ZN = 275, ZF = -250, X0 = -300, X1 = 300;

/** deterministic PRNG (mulberry32): the same skyline on every visit */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

export async function buildCity(THREE: Three, o: CityOpts): Promise<City> {
  const [{ Reflector }, { mergeGeometries }] = await Promise.all([
    import('three/examples/jsm/objects/Reflector.js'),
    import('three/examples/jsm/utils/BufferGeometryUtils.js'),
  ]);
  const { pathX, heightAt, riverEnd, tower, mobile } = o;
  const r = rng(20251022);
  const onRiver = (x: number, z: number, pad: number) => z > riverEnd - 8 && Math.abs(x - pathX(z)) - pad < BANK;
  const nearTower = (x: number, z: number, pad: number) => Math.hypot(x - tower.x, z - tower.z) - pad < 26;

  // shared uniforms (fog colour is converted to the raw values these shaders output)
  const fogRaw = new THREE.Color();
  const U = {
    uTime: { value: 0 }, uNight: { value: 1 }, uCam: { value: new THREE.Vector3() },
    uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uKey: { value: new THREE.Color() },
    uSky: { value: new THREE.Color() }, uGnd: { value: new THREE.Color() }, uSkyRefl: { value: new THREE.Vector3() },
    uFogCol: { value: fogRaw }, uFogNear: { value: o.fog.near }, uFogFar: { value: o.fog.far },
    uTower: { value: new THREE.Vector3(tower.x, 0, tower.z) }, uScale: { value: 400 }, uLamp: { value: 1 },
  };
  const COMMON = `
    uniform float uTime; uniform float uNight; uniform vec3 uCam;
    uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar;
    float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    ${o.pathGlsl}
    float fogK(vec3 w) { return smoothstep(uFogNear, uFogFar, distance(w, uCam)); }
    // colours are tuned as display values; the bloom / output passes work in linear light
    vec3 toLin(vec3 c) { return min(pow(max(c, 0.0), vec3(2.2)), vec3(12.0)); } // capped: no half-float overflow
    vec3 neon(float k) {
      return k < 0.62 ? vec3(0.0, 0.9, 1.0) : k < 0.82 ? vec3(1.0, 0.16, 0.62) : k < 0.92 ? vec3(0.55, 0.42, 1.0) : vec3(1.0, 0.6, 0.15);
    }`;

  // ---------- buildings ----------
  const bPos: number[] = [], bSize: number[] = [], bSeed: number[] = [];
  const tops: { x: number; z: number; y: number }[] = [];
  const add = (x: number, y: number, z: number, w: number, h: number, d: number, seed: number) => {
    bPos.push(x, y, z); bSize.push(w, h, d); bSeed.push(seed);
  };
  const density = mobile ? 0.6 : 1;
  // warm lights scattered around the hillside buildings (porches, terraces, a lit road up to the door)
  const hillLamps: number[] = [];
  for (let gz = Math.floor(ZF / CELL); gz < Math.ceil(ZN / CELL); gz++) {
    for (let gx = Math.floor(X0 / CELL); gx < Math.ceil(X1 / CELL); gx++) {
      const cx = gx * CELL + CELL / 2, cz = gz * CELL + CELL / 2;
      const dx = Math.abs(cx - pathX(cz));
      if (dx > HILLS) continue;
      if (dx > FLAT) {
        // ---- the hills: sparse, smaller buildings sitting on the slopes ----
        // denser in the foothills, thinning toward the peaks
        if (r() > (mobile ? 0.6 : 1) * (0.55 - 0.4 * smooth((dx - 90) / 120))) continue;
        const x = cx + (r() - 0.5) * 5, z = cz + (r() - 0.5) * 5;
        const w = 5 + r() * 5, d = 5 + r() * 5;
        const hs = [heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z + d / 2)];
        const lo = Math.min(...hs), hi = Math.max(...hs);
        if (hi - lo > 14 || lo > 120) continue; // stepped into the slope, but no cliff-hangers or peak tops
        const base = lo - 0.8; // sunk a little so the downhill side never floats
        const h = (r() < 0.06 ? 18 + r() * 14 : 4 + r() * 10) + (hi - lo);
        add(x, base, z, w, h, d, r() * 0.999 + 0.001);
        tops.push({ x, z, y: base + h });
        for (let k = 0, n = 3 + Math.floor(r() * 4); k < n; k++) {
          const lx = x + (r() - 0.5) * (w + 6), lz = z + (r() - 0.5) * (d + 6);
          hillLamps.push(lx, heightAt(lx, lz) + 0.6, lz);
        }
        continue;
      }
      // ---- the riverside city: dense, tallest along the banks ----
      if (r() > density * (1 - smooth((dx - 55) / 30) * 0.45)) continue;
      const L = CELL - STREET;
      const q = r();
      const lots: [number, number, number, number][] = q < 0.45 ? [[0, 0, L, L]]
        : q < 0.75 ? (r() < 0.5 ? [[-L / 4, 0, L / 2, L], [L / 4, 0, L / 2, L]] : [[0, -L / 4, L, L / 2], [0, L / 4, L, L / 2]])
          : [[-L / 4, -L / 4, L / 2, L / 2], [L / 4, -L / 4, L / 2, L / 2], [-L / 4, L / 4, L / 2, L / 2], [L / 4, L / 4, L / 2, L / 2]];
      for (const [ox, oz, lw, ld] of lots) {
        const x = cx + ox, z = cz + oz;
        const w = (lw - 0.8) * (0.82 + 0.18 * r()), d = (ld - 0.8) * (0.82 + 0.18 * r());
        if (onRiver(x, z, Math.max(w, d) / 2) || nearTower(x, z, Math.max(w, d) / 2)) continue;
        const dT = Math.hypot(x - tower.x, z - tower.z), bdx = Math.abs(x - pathX(z));
        // skyscrapers crowd the banks and step down toward the foothills
        let h = 7 + Math.pow(r(), 2) * 20 + 40 * Math.exp(-dT / 120) * r() + 28 * Math.exp(-Math.max(0, bdx - 16) / 28) * (0.5 + 0.5 * r());
        // a few megatowers for the skyline, kept clear of the river canyon and shorter than the hub nearby
        if (r() < 0.05 && bdx > 28 && bdx < 55) h = 60 + r() * 35;
        // the outer blocks stay low, so the step from towers to hills reads from the air
        if (bdx > 55) h = Math.min(h, 10 + r() * 10);
        if (dT < 90) h = Math.min(h, 52);
        const seed = r() * 0.999 + 0.001;
        if (lots.length === 1 && r() < 0.3 && h > 20) {
          // podium with a slimmer tower stacked on top
          const ph = 5 + r() * 5;
          add(x, 0, z, w, ph, d, seed);
          add(x, ph, z, w * 0.62, h - ph, d * 0.62, (seed * 7.77) % 1 || 0.5);
        } else add(x, 0, z, w, h, d, seed);
        if (h > 22) tops.push({ x, z, y: h });
      }
    }
  }
  // bridges over the river every 4th cross street (negative seed = bridge styling)
  const bridgeZ: number[] = [];
  for (let gz = Math.ceil((riverEnd + 6) / CELL); gz * CELL < ZN; gz++) {
    if (gz % 4 !== 0) continue;
    const z = gz * CELL;
    bridgeZ.push(z);
    add(pathX(z), 1.4, z, 2 * BANK + 8, 0.8, 3.4, -0.5);
  }
  // draw nearest-first (the camera looks down the river toward -z), so the depth test skips hidden facades
  // instead of shading them: the city overlaps itself a lot
  const order = bSeed.map((_, i) => i).sort((i, j) => bPos[j * 3 + 2] - bPos[i * 3 + 2]);
  const pick = (a: number[], k: number) => order.flatMap(i => a.slice(i * k, i * k + k));
  bPos.splice(0, bPos.length, ...pick(bPos, 3));
  bSize.splice(0, bSize.length, ...pick(bSize, 3));
  bSeed.splice(0, bSeed.length, ...pick(bSeed, 1));
  const nB = bSeed.length;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const bGeo = new THREE.InstancedBufferGeometry();
  bGeo.index = box.index;
  bGeo.setAttribute('position', box.getAttribute('position'));
  bGeo.setAttribute('normal', box.getAttribute('normal'));
  bGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(bPos), 3));
  bGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(bSize), 3));
  bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(bSeed), 1));
  bGeo.instanceCount = nB;
  const bMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `
      attribute vec3 aPos; attribute vec3 aSize; attribute float aSeed;
      varying vec3 vL; varying vec3 vN; varying vec3 vS; flat varying float vSeed; varying vec3 vW;
      void main() {
        vL = position * aSize; vN = normal; vS = aSize; vSeed = aSeed;
        vW = aPos + vL + vec3(0.0, aSize.y * 0.5, 0.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uKeyDir; uniform vec3 uKey; uniform vec3 uSky; uniform vec3 uGnd; uniform vec3 uSkyRefl;
      ${COMMON}
      varying vec3 vL; varying vec3 vN; varying vec3 vS; flat varying float vSeed; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN);
        // the hashes below amplify any interpolation wobble into per-pixel noise: keep their inputs exact
        float h = vS.y, v = vL.y + h * 0.5, s = floor(abs(vSeed) * 4096.0 + 0.5) / 4096.0;
        float faceK = dot(floor(N + 0.5), vec3(3.0, 0.0, 7.0));
        float glow = 0.3 + 0.7 * uNight;
        float lightK = mix(0.32, 1.0, uNight); // interiors still read through the glass by day
        vec3 amb = mix(uGnd, uSky, N.y * 0.5 + 0.5);
        // facades: concrete / steel by day, blue-grey at night, lit from below by the street and filled by the
        // city's own cyan glow, so they read as surfaces rather than holes
        vec3 wall = mix(vec3(0.1, 0.115, 0.135), vec3(0.05, 0.064, 0.085), uNight) * (0.78 + 0.44 * fract(s * 91.7));
        vec3 col = wall * (amb + uKey * max(dot(N, uKeyDir), 0.0));
        col += uNight * (wall * vec3(0.55, 0.8, 1.0) * 0.85 + vec3(0.11, 0.075, 0.05) * exp(-v / 6.0) * (1.0 - N.y));
        vec3 em = vec3(0.0);
        float style = fract(s * 7.31);
        vec3 nc = neon(fract(s * 3.17));
        // facade coordinates (derivatives must be taken outside the per-face branches below)
        float u = abs(N.x) > 0.5 ? vL.z : vL.x;
        float fw = abs(N.x) > 0.5 ? vS.z : vS.x;
        vec2 cell = vec2(u / 1.5, v / 2.1);
        vec2 aa = fwidth(cell);
        float far = smoothstep(0.14, 0.45, max(aa.x, aa.y));
        float px = fwidth(u); // metres per pixel: keeps thin neon at least ~1.5px wide (no stair-stepping)
        float pv = fwidth(v);
        if (vSeed < 0.0) {
          // bridge deck: a cyan light strip along each side
          if (abs(N.z) > 0.5) em += vec3(0.0, 0.85, 1.0) * smoothstep(max(0.14, pv * 2.5), 0.0, abs(vL.y)) * 0.7 * glow;
        } else if (N.y < 0.5 && far > 0.98) {
          // distant facades: skip the per-window work entirely (the overview of the city is the costliest view)
          col = mix(col, mix(vec3(0.014, 0.028, 0.042), uSkyRefl * 0.6, 1.0 - uNight), 0.3)
            + vec3(0.62, 0.78, 0.92) * (0.22 + 0.3 * fract(s * 13.7)) * 0.38 * lightK;
          if (style > 0.5) em += nc * smoothstep(max(0.2, pv * 1.5), 0.0, abs(v - (h - 0.9))) * 1.1 * glow;
        } else if (N.y < 0.5) {
          vec2 id = floor(cell), f = fract(cell);
          // anti-aliased window openings, with floor slabs and mullions between them
          float wx = smoothstep(0.17 - aa.x, 0.17 + aa.x, f.x) - smoothstep(0.83 - aa.x, 0.83 + aa.x, f.x);
          float wy = smoothstep(0.3 - aa.y, 0.3 + aa.y, f.y) - smoothstep(0.86 - aa.y, 0.86 + aa.y, f.y);
          float win = wx * wy * step(3.6, v) * step(v, h - 1.4);
          float slab = (1.0 - smoothstep(0.12 - aa.y, 0.12 + aa.y, f.y)) * step(3.6, v);
          col *= 1.0 + 0.35 * slab;
          float rnd = hash1(id + vec2(s * 41.3, faceK));
          float ratio = 0.22 + 0.3 * fract(s * 13.7);
          float lit = step(rnd, ratio);
          float r2 = hash1(id * 1.7 + s * 17.0 + faceK);
          // mostly cool white / cyan offices, warm homes, the odd neon-pink room
          vec3 wc = r2 < 0.46 ? vec3(0.6, 0.84, 1.0) : r2 < 0.8 ? vec3(1.0, 0.74, 0.48) : r2 < 0.965 ? vec3(0.15, 0.78, 1.0) : vec3(1.0, 0.32, 0.72);
          float r3 = hash1(id * 3.1 + s + faceK);
          // brightness varies; some rooms have the blinds half down; a soft falloff toward the ceiling
          float blind = r3 < 0.3 ? smoothstep(0.32 + 0.45 * r3 / 0.3 + aa.y, 0.32 + 0.45 * r3 / 0.3 - aa.y, f.y) : 1.0;
          vec3 room = wc * (0.45 + 0.6 * hash1(id * 5.7 + s)) * mix(1.0, 0.72, smoothstep(0.3, 0.86, f.y)) * blind;
          if (r2 > 0.985) lit *= 0.65 + 0.35 * sin(uTime * 1.3 + rnd * 20.0); // a few breathe (hard flicker flashes under bloom)
          // unlit glass: the city's glow at night; by day panes mirror the sky, each catching it differently
          vec3 glass = mix(vec3(0.014, 0.028, 0.042) * (0.7 + 0.6 * r3), uSkyRefl * (0.35 + 0.55 * r3), 1.0 - uNight);
          vec3 near = mix(col, mix(glass, room, lit * lightK), win);
          // distant facades: average the window pattern instead of letting it shimmer
          vec3 avg = mix(col, glass, 0.3) + vec3(0.62, 0.78, 0.92) * ratio * 0.38 * lightK;
          col = mix(near, avg, far);
          // storefronts: warm shop glow with a thin neon sign strip above each unit
          float unit = floor(u / 4.0), shop = step(0.35, fract(s * 11.9 + unit * 0.61));
          float inUnit = step(0.35, fract(u / 4.0)) * step(fract(u / 4.0), 0.92);
          em += vec3(1.0, 0.7, 0.42) * step(0.4, v) * step(v, 2.3) * inUnit * shop * 0.2 * glow;
          em += neon(fract(s * 5.3 + unit * 0.37)) * smoothstep(max(0.16, pv * 1.5), 0.0, abs(v - 2.75)) * inUnit * shop * 0.9 * glow;
          // neon crown band + edge lines on styled buildings
          if (style > 0.5) em += nc * smoothstep(max(0.2, pv * 1.5), 0.0, abs(v - (h - 0.9))) * 1.1 * glow;
          if (style > 0.8) em += nc * smoothstep(fw * 0.5 - max(0.2, px * 1.5), fw * 0.5, abs(u)) * 0.9 * glow;
          // vertical signs on river-facing walls, scrolling and flickering
          float side = pathX(vW.z) - vW.x;
          if (fract(s * 5.13) > 0.82 && h > 14.0 && N.x * sign(side) > 0.5) {
            float sw = min(1.7, fw * 0.22), sh = min(16.0, h * 0.45), y0 = h * 0.3;
            float inSign = step(abs(u), sw) * step(y0, v) * step(v, y0 + sh);
            float stripes = 0.62 + 0.18 * smoothstep(0.2, 0.8, abs(fract(v * 0.6 - uTime * (0.5 + fract(s * 3.0))) - 0.5) * 2.0);
            float flick = 0.85 + 0.15 * sin(uTime * 2.0 + s * 30.0);
            float bw = max(0.16, px * 1.5);
            float frame = max(step(sw - bw, abs(u)), max(step(v, y0 + bw), step(y0 + sh - bw, v)));
            em += neon(fract(s * 9.7)) * inSign * mix(stripes, 1.15, frame) * flick * 0.6 * glow;
          }
        } else {
          // roofs: neon rim on styled buildings (it's what you see on the way down)
          vec2 q = abs(vL.xz) - vS.xz * 0.5 + max(0.3, px * 1.5);
          if (style > 0.5) em += nc * step(0.0, max(q.x, q.y)) * 0.8 * glow;
        }
        col += em;
        // low cyan haze (light pollution) hugging the streets at night
        col += vec3(0.0, 0.04, 0.06) * exp(-min(v, h) / 9.0) * uNight;
        float lumen = step(0.02, max(em.r, max(em.g, em.b)));
        col = mix(col, uFogCol, fogK(vW) * (1.0 - 0.4 * lumen));
        gl_FragColor = vec4(toLin(col), 1.0);
      }`,
  });
  const buildings = new THREE.Mesh(bGeo, bMat);
  buildings.frustumCulled = false;

  // ---------- river (real reflections, rippled and smeared into light streaks) ----------
  const rp: number[] = [], ri: number[] = [];
  let n = 0;
  for (let z = ZN; z >= riverEnd - 3; z -= 3, n++) {
    const c = pathX(z);
    rp.push(c - RIVER_W, -z, 0, c + RIVER_W, -z, 0); // local XY plane; rotated flat below
    if (n) { const a = 2 * n - 2; ri.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  }
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  rGeo.setIndex(ri);
  const water = new Reflector(rGeo, {
    textureWidth: 512, textureHeight: 512, clipBias: 0.003, multisample: 0,
    shader: {
      name: 'NeonRiver',
      uniforms: {
        color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
        uTime: { value: 0 }, uNight: { value: 1 }, uCam: { value: new THREE.Vector3() }, uSkyRefl: { value: new THREE.Vector3() },
        uFogCol: { value: new THREE.Color() }, uFogNear: { value: o.fog.near }, uFogFar: { value: o.fog.far },
      },
      vertexShader: `
        uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          vW = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uTime; uniform float uNight; uniform vec3 uCam; uniform vec3 uSkyRefl;
        uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar;
        varying vec4 vUv; varying vec3 vW;
        void main() {
          vec2 q = vW.xz;
          float n1 = sin(q.x * 0.8 + uTime * 1.1) + 0.7 * sin(q.y * 0.45 - uTime * 1.6) + 0.35 * sin((q.x - q.y) * 1.9 + uTime * 2.3);
          float n2 = sin(q.y * 0.7 + uTime * 1.3) + 0.5 * sin((q.x + q.y) * 1.3 - uTime * 1.9);
          vec4 p = vUv;
          p.xy += vec2(n1 * 0.0007, n2 * 0.00015) * p.w; // a gentle wobble: the mirror stays readable, day and night
          // smear along the reflection's vertical so neon stretches into streaks
          vec3 refl = vec3(0.0);
          // a slight vertical softening only: a clear mirror, as crisp at night as by day
          for (int i = -1; i <= 1; i++) {
            vec4 pi = p;
            pi.y += float(i) * 0.0012 * p.w;
            refl += texture2DProj(tDiffuse, pi).rgb * (i == 0 ? 0.5 : 0.25);
          }
          float graze = 1.0 - abs(normalize(uCam - vW).y);
          // the reflection is already linear light; the tuned (display-value) tints are converted to match
          vec3 tint = vec3(0.012, 0.05, 0.07) + uSkyRefl * 0.12 * (1.0 - uNight);
          vec3 c = pow(tint, vec3(2.2)) + refl * (0.55 + 0.35 * graze);
          c = mix(c, pow(uFogCol, vec3(2.2)), smoothstep(uFogNear, uFogFar, distance(vW, uCam)) * 0.9);
          gl_FragColor = vec4(c, 1.0);
        }`,
    },
  });
  // (the reflection always refreshes every frame: skipping frames showed the previous camera's view, then snapped)
  let reflScale = 1, reflW = 0, reflH = 0, baseRW = 2, baseRH = 2;
  const sizeReflection = () => {
    const k = (mobile ? 0.4 : 0.5) * reflScale;
    const w = Math.max(64, Math.round(baseRW * k)), h = Math.max(64, Math.round(baseRH * k));
    if (w === reflW && h === reflH) return;
    reflW = w; reflH = h;
    water.getRenderTarget().setSize(w, h);
  };
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  const wU = (water.material as T.ShaderMaterial).uniforms as Record<string, { value: unknown }>;

  // ---------- street lamps + river-bank lights (static) ----------
  const dotCv = document.createElement('canvas');
  dotCv.width = dotCv.height = 32;
  const dg = dotCv.getContext('2d');
  if (dg) {
    const gr = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = gr; dg.fillRect(0, 0, 32, 32);
  }
  const dotTex = new THREE.CanvasTexture(dotCv);
  const lp: number[] = [], lc: number[] = [];
  const SODIUM = [1, 0.62, 0.3], WHITE = [0.78, 0.88, 1], CYAN = [0, 0.9, 1], PINK = [1, 0.2, 0.65];
  const lamp = (x: number, y: number, z: number, c: number[]) => { lp.push(x, y, z); lc.push(c[0], c[1], c[2]); };
  const step = mobile ? 9 : 6;
  for (let gz = Math.floor(ZF / CELL); gz < Math.ceil(ZN / CELL); gz++) {
    const z = gz * CELL, bridge = bridgeZ.includes(z);
    for (let x = X0; x < X1; x += step) {
      if (Math.abs(x - pathX(z)) > FLAT || nearTower(x, z, 0)) continue;
      if (onRiver(x, z, 0)) { if (bridge) lamp(x, 2.4, z + 1.9, CYAN); continue; }
      lamp(x, 0.9, z + 2.2, r() < 0.7 ? SODIUM : WHITE);
    }
  }
  for (let gx = Math.floor(X0 / CELL); gx < Math.ceil(X1 / CELL); gx++) {
    const x = gx * CELL;
    for (let z = ZF; z < ZN; z += step) {
      if (Math.abs(x - pathX(z)) > FLAT || onRiver(x, z, 0) || nearTower(x, z, 0)) continue;
      lamp(x + 2.2, 0.9, z, r() < 0.7 ? SODIUM : WHITE);
    }
  }
  // embankments: a neon line of lights down both banks (doubles in the water)
  for (let z = riverEnd; z < ZN; z += mobile ? 3.5 : 2.4) {
    const c = pathX(z), k = Math.floor(z / 2.4);
    lamp(c - RIVER_W - 0.6, 0.4, z, k % 7 === 0 ? PINK : CYAN);
    lamp(c + RIVER_W + 0.6, 0.4, z, k % 9 === 0 ? PINK : CYAN);
  }
  for (let i = 0; i < hillLamps.length; i += 3) lamp(hillLamps[i], hillLamps[i + 1], hillLamps[i + 2], r() < 0.8 ? SODIUM : WHITE);
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lampGeo.setAttribute('aCol', new THREE.Float32BufferAttribute(lc, 3));
  // same energy-conserving points as the traffic (see carMat)
  const lampMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aCol; uniform float uScale; uniform float uLamp;
      varying vec3 vCol; varying float vA; varying vec3 vW;
      void main() {
        vec4 mv = viewMatrix * vec4(position, 1.0);
        float px = uScale * 0.85 / max(1.0, -mv.z);
        vW = position; vCol = aCol; vA = uLamp * min(1.0, px * px / 2.25);
        gl_PointSize = clamp(px, 1.5, 14.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      ${COMMON}
      varying vec3 vCol; varying float vA; varying vec3 vW;
      void main() {
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(toLin(vCol) * a * a * vA * (1.0 - 0.8 * fogK(vW)), 1.0);
      }`,
  });
  const lamps = new THREE.Points(lampGeo, lampMat);

  // ---------- traffic: street cars (head / tail lights) + airborne lanes over the river ----------
  const CARS = mobile ? 1300 : 2800;
  const aLine = new Float32Array(CARS * 4), aMot = new Float32Array(CARS * 4), aCol = new Float32Array(CARS * 3);
  const HEAD = [0.95, 0.95, 1], TAIL = [1, 0.12, 0.1];
  for (let i = 0; i < CARS; i++) {
    const dir = r() < 0.5 ? 1 : -1;
    let col: number[], axis: number, fixed: number, lo: number, hi: number, y: number, kind: number, speed: number;
    if (r() < 0.9) {
      if (r() < 0.5) {
        const z = (Math.floor(ZF / CELL) + Math.floor(r() * ((ZN - ZF) / CELL))) * CELL;
        axis = 0; fixed = z + dir * 0.9; lo = X0; hi = X1; kind = bridgeZ.includes(z) ? 1 : 0;
        col = r() < 0.5 ? HEAD : TAIL;
      } else {
        const x = (Math.floor(X0 / CELL) + Math.floor(r() * ((X1 - X0) / CELL))) * CELL;
        axis = 1; fixed = x - dir * 0.9; lo = ZF; hi = ZN; kind = 0;
        col = dir > 0 ? HEAD : TAIL; // coming toward the camera: headlights
      }
      y = 0.6; speed = (5 + r() * 8) * dir;
    } else {
      axis = 1; fixed = (r() < 0.5 ? -1 : 1) * (3 + r() * 11); lo = riverEnd - 40; hi = ZN; kind = 2;
      y = 22 + r() * 26; speed = (12 + r() * 16) * dir;
      const k = r();
      col = k < 0.45 ? CYAN : k < 0.7 ? HEAD : k < 0.85 ? PINK : TAIL;
    }
    aLine.set([axis, fixed, lo, hi], i * 4);
    aMot.set([speed, r() * 1000, y, kind], i * 4);
    aCol.set(col, i * 3);
  }
  const carGeo = new THREE.BufferGeometry();
  carGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CARS * 3), 3)); // placed in the shader
  carGeo.setAttribute('aLine', new THREE.BufferAttribute(aLine, 4));
  carGeo.setAttribute('aMot', new THREE.BufferAttribute(aMot, 4));
  carGeo.setAttribute('aCol', new THREE.BufferAttribute(aCol, 3));
  const carMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aLine; attribute vec4 aMot; attribute vec3 aCol;
      uniform vec3 uTower; uniform float uScale;
      ${COMMON}
      varying vec3 vCol; varying float vA; varying vec3 vW;
      void main() {
        float s = aLine.z + mod(aMot.y + uTime * aMot.x, aLine.w - aLine.z);
        vec3 p = aLine.x < 0.5 ? vec3(s, aMot.z, aLine.y) : vec3(aLine.y, aMot.z, s);
        float riv = abs(p.x - pathX(p.z));
        if (aMot.w > 1.5) p.x = pathX(p.z) + aLine.y;
        else if (aMot.w > 0.5 && riv < ${(BANK + 3).toFixed(1)}) p.y = 2.3; // over the bridge
        float hide = (aMot.w < 0.5 && riv < ${BANK.toFixed(1)} && p.z > ${(riverEnd - 8).toFixed(1)}) || (aMot.w < 1.5 && distance(p.xz, uTower.xz) < 26.0)
          || (aMot.w < 1.5 && riv > ${FLAT.toFixed(1)}) ? 1.0 : 0.0; // streets stop where the hills begin
        vW = p; vCol = aCol; vA = 1.0 - hide;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        // flying cars are lights you notice at night; by day they all but vanish
        vA *= aMot.w > 1.5 ? 0.06 + 0.94 * uNight : 0.3 + 0.7 * uNight;
        // a light smaller than a pixel still rasterises at full brightness, so hundreds of distant ones lined
        // up along a street (or down the river) add up into a blinding blob under bloom: give each only its
        // true share of a pixel's light
        float px = uScale * (aMot.w > 1.5 ? 1.0 : 0.55) / max(1.0, -mv.z);
        vA *= min(1.0, px * px / 2.25);
        gl_PointSize = vA > 0.0 ? clamp(px, 1.5, 18.0) : 0.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      ${COMMON}
      varying vec3 vCol; varying float vA; varying vec3 vW;
      void main() {
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(toLin(vCol) * a * a * vA * (1.0 - 0.8 * fogK(vW)), 1.0);
      }`,
  });
  const cars = new THREE.Points(carGeo, carMat);
  cars.frustumCulled = false;

  // ---------- network: packets arcing rooftop to rooftop, the tower as the hub ----------
  const hub = { x: tower.x, z: tower.z, y: tower.top };
  const links: [typeof hub, typeof hub][] = [];
  const cands = tops.filter(t => { const d = Math.hypot(t.x - hub.x, t.z - hub.z); return d > 45 && d < 330; });
  // hub spokes spread around the compass, then short hops between neighbours
  const SPOKES = mobile ? 8 : 12;
  for (let k = 0; k < SPOKES; k++) {
    const want = (k / SPOKES) * Math.PI * 2;
    let best: typeof hub | null = null, bestScore = Infinity;
    for (const c of cands) {
      const a = Math.atan2(c.z - hub.z, c.x - hub.x);
      const da = Math.abs(((a - want + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const score = da * 120 + Math.hypot(c.x - hub.x, c.z - hub.z) * 0.15 - c.y * 0.3;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (best) links.push([hub, best]);
  }
  for (let k = 0; k < (mobile ? 10 : 18) && cands.length > 1; k++) {
    const a = cands[Math.floor(r() * cands.length)];
    let best: typeof hub | null = null, bd = Infinity;
    for (const c of cands) {
      const d = Math.hypot(c.x - a.x, c.z - a.z);
      if (c !== a && d > 25 && d < 110 && d < bd) { bd = d; best = c; }
    }
    if (best) links.push([a, best]);
  }
  // pipes along each link: a dim tube in its own colour (mostly cyan, a few magenta) with a white-hot packet
  // of light travelling inside; the bloom pass turns the packet into a neon glow of the pipe's colour
  const tubes: T.BufferGeometry[] = [];
  const junctions: T.BufferGeometry[] = [];
  for (const [a, b] of links) {
    const ay = a.y + 0.9, by = b.y + 0.9, d = Math.hypot(b.x - a.x, b.z - a.z);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(a.x, ay, a.z),
      new THREE.Vector3((a.x + b.x) / 2, Math.max(ay, by) + d * 0.2 + 6, (a.z + b.z) / 2),
      new THREE.Vector3(b.x, by, b.z),
    );
    const len = curve.getLength();
    const g = new THREE.TubeGeometry(curve, Math.max(16, Math.round(len / 4)), a === hub ? 0.32 : 0.24, 6, false);
    const cnt = g.getAttribute('position').count;
    const pink = r() < 0.15;
    const ph = r();
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(new Float32Array(cnt * 3).map((_, i) => [len, ph, pink ? 1 : 0][i % 3]), 3));
    tubes.push(g);
    // junction box where the pipe meets each rooftop
    for (const e of [a, b]) {
      if (e === hub) continue;
      const jb = new THREE.BoxGeometry(1.4, 0.9, 1.4);
      jb.translate(e.x, e.y + 0.45, e.z);
      junctions.push(jb);
    }
  }
  const pipeGeo = tubes.length ? mergeGeometries(tubes) : new THREE.BufferGeometry();
  tubes.forEach(g => { g.dispose(); });
  const pipeMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 aInfo; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vInfo;
      void main() {
        vUv = uv; vInfo = aInfo; vN = normalize(normal); vW = position;
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      ${COMMON}
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vInfo;
      void main() {
        vec3 tint = vInfo.z > 0.5 ? vec3(1.0, 0.2, 0.66) : vec3(0.0, 0.9, 1.0);
        // (no pow() on values that can go negative: GPUs return NaN there, and bloom smears NaN into giant flares)
        float rim = 1.0 - min(1.0, abs(dot(normalize(vN), normalize(uCam - vW)))); rim *= rim;
        // a packet every ~45 m, sliding along the pipe: white at its core, the pipe's colour at its edges
        float q = fract(vUv.x * vInfo.x / 45.0 - uTime * 0.45 + vInfo.y);
        float dq = q - 0.5;
        float pkt = exp(-dq * dq * 676.0);
        float halo = exp(-dq * dq * 81.0);
        // the tube itself: the same colour, dim (a faint sheen at the edges), lit around the passing packet
        vec3 tube = tint * (0.22 + 0.18 * rim + 0.5 * halo) * (0.6 + 0.4 * uNight);
        vec3 c = mix(tube, vec3(1.0) * 1.35, smoothstep(0.35, 0.9, pkt));
        float alpha = clamp(0.8 + pkt, 0.0, 1.0) * (1.0 - 0.85 * fogK(vW));
        gl_FragColor = vec4(toLin(c), alpha);
      }`,
  });
  const net = new THREE.Mesh(pipeGeo, pipeMat);
  const nodeGeo = junctions.length ? mergeGeometries(junctions) : new THREE.BufferGeometry();
  junctions.forEach(g => { g.dispose(); });
  const nodeMat = new THREE.MeshStandardMaterial({ color: 0x0b1620, roughness: 0.5, metalness: 0.6, emissive: 0x00e5ff, emissiveIntensity: 0.35 });
  const nodes = new THREE.Mesh(nodeGeo, nodeMat);

  const beacons: number[] = [];
  for (const t of tops) if (t.y > 60) beacons.push(t.x, t.y + 1, t.z);

  const fogLin = o.fog.color;
  const city: City = {
    objects: [buildings, water, lamps, cars, net, nodes],
    beacons,
    setLight: (keyDir, key, sky, ground, night, skyRaw) => {
      U.uKeyDir.value.copy(keyDir).normalize();
      U.uKey.value.copy(key); U.uSky.value.copy(sky); U.uGnd.value.copy(ground);
      U.uNight.value = night;
      U.uSkyRefl.value.copy(skyRaw);
      fogRaw.copy(fogLin).convertLinearToSRGB();
      U.uLamp.value = 0.25 + 0.75 * night;
      nodeMat.emissiveIntensity = 0.15 + 0.35 * night;
      wU.uNight.value = night;
      (wU.uSkyRefl.value as T.Vector3).copy(skyRaw);
      (wU.uFogCol.value as T.Color).copy(fogRaw);
    },
    setReflectScale: k => { reflScale = k; sizeReflection(); },
    update: (t, cam) => {
      U.uTime.value = t;
      U.uCam.value.copy(cam);
      wU.uTime.value = t;
      (wU.uCam.value as T.Vector3).copy(cam);
    },
    setSize: (_w, h, baseW, baseH) => {
      baseRW = baseW; baseRH = baseH;
      sizeReflection(); // half-res reflections (0.4 on phones): plenty under the ripples
      U.uScale.value = h / (2 * Math.tan(29 * Math.PI / 180));
    },
    dispose: () => {
      [box, bGeo, rGeo, lampGeo, carGeo, pipeGeo, nodeGeo].forEach(g => { g.dispose(); });
      [bMat, lampMat, carMat, pipeMat, nodeMat].forEach(m => { m.dispose(); });
      dotTex.dispose();
      water.dispose();
    },
  };
  return city;
}
