import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useMemo, useLayoutEffect } from "react";
import { BASE_LAYER, HAZE_OPACITY } from "../constants/render";
import * as THREE from "three";
import feathered from '../assets/feathered60.png';
import { generateObjects, hazeScale,clamp } from "../utils/galaxyMath";
import { NUM_STARS, HAZE_RATIO } from "../constants/galaxy";
import { HazeProps } from "../types/types";



const Haze: React.FC<HazeProps> = ({direction, color,cluster}) => {

  const hazeTexture = useLoader(THREE.TextureLoader, feathered);
  const hazeMatrix = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const hazeMeshRef = useRef<THREE.InstancedMesh>(null);
  const hazeGeometry = useMemo(() => new THREE.CircleGeometry(), []);

  const hazeMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      map: hazeTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      opacity: HAZE_OPACITY,
      color: color
    }),
  [hazeTexture]);

  const genHaze = useMemo(() => 
    generateObjects(NUM_STARS * HAZE_RATIO, cluster ,(pos) => ({ position: pos }))
  , []);

  useLayoutEffect(() => {
    if (hazeMeshRef.current) {
        genHaze.forEach((hazeItem, i) => {
        hazeMatrix.current.setPosition(hazeItem.position);
        hazeMeshRef.current?.setMatrixAt(i, hazeMatrix.current);
        });
        hazeMeshRef.current.layers.set(BASE_LAYER);
        hazeMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame(({ clock, camera }) => {
    const time = clock.getElapsedTime();
    if (hazeMeshRef.current) {
        genHaze.forEach((hazeItem, i) => {
            const dist = hazeItem.position.distanceTo(camera.position) / 250;
            const opacity = clamp(HAZE_OPACITY * Math.pow(dist / 2.5, 2), 0, HAZE_OPACITY);
            const distanceFromCenter = new THREE.Vector2(hazeItem.position.x, hazeItem.position.y).length();
            const scale = hazeScale(time,distanceFromCenter, direction);

            hazeMaterial.opacity = opacity;
            hazeMatrix.current.makeScale(scale, scale, scale); 
            hazeMatrix.current.setPosition(hazeItem.position);
            hazeMeshRef.current?.setMatrixAt(i, hazeMatrix.current);
          });
      
          hazeMeshRef.current.instanceMatrix.needsUpdate = true;
          }
  })
    return (
        <instancedMesh
        ref={hazeMeshRef}
        args={[hazeGeometry, hazeMaterial, NUM_STARS * HAZE_RATIO]}
      />
    )
};

export default Haze;