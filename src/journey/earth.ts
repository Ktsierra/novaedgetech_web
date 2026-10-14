import dayUrl from '../assets/earth/earth_atmos_2048.jpg';
import normalUrl from '../assets/earth/earth_normal_2048.jpg';
import specUrl from '../assets/earth/earth_specular_2048.jpg';
import cloudsUrl from '../assets/earth/earth_clouds_1024.png';

export interface EarthView {
  /** backing-store size in device pixels (the canvas CSS size is set by Journey.css) */
  setSize: (px: number) => void;
  render: (now: number) => void;
  dispose: () => void;
}

/** canvas extends 6% past the globe on every side so the atmosphere rim has room (matches .j-earth inset) */
export const EARTH_FRAME = 1.12;

const D = Math.PI / 180;
const TILT = 23.44 * D;
const FACE_LON = -80; // the Americas face the camera
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
  const [day, normal, spec, clouds] = await Promise.all([load(dayUrl, true), load(normalUrl), load(specUrl), load(cloudsUrl, true)]);

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

  const earth = new THREE.Group();
  earth.rotation.set(0.22, 0, -TILT); // slight look-down + axial tilt
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
    blending: THREE.AdditiveBlending,
  });
  const rimMat = rimShader('pow(1.0 - facing, 3.0)', 1.1, THREE.FrontSide);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.008, 96, 72), rimMat);
  // halo shell: brightest where it meets the globe edge (facing ≈ 0.36 for r = 1.07), fading out to its own silhouette
  const haloMat = rimShader('pow(smoothstep(0.0, 0.36, facing), 2.2)', 0.75, THREE.BackSide);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.07, 96, 72), haloMat);
  scene.add(rim, halo);

  let t0 = -1;
  return {
    setSize: (px: number) => {
      const s = Math.max(2, Math.round(px));
      renderer.setPixelRatio(1);
      renderer.setSize(s, s, false);
    },
    render: (now: number) => {
      if (t0 < 0) t0 = now;
      const t = (now - t0) / 1000;
      surface.rotation.y = faceY + t * 0.018;
      cloudMesh.rotation.y = faceY + t * 0.024;
      renderer.render(scene, cam);
    },
    dispose: () => {
      [day, normal, spec, clouds, rough].forEach(tx => tx?.dispose());
      [surfGeo, cloudGeo, rim.geometry, halo.geometry].forEach(g => { g.dispose(); });
      [surfMat, cloudMat, rimMat, haloMat].forEach(m => { m.dispose(); });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
