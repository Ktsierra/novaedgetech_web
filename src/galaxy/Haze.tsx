/* eslint-disable react/no-unknown-property */
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BASE_LAYER, HAZE_MAX, HAZE_MIN, HAZE_OPACITY } from "../constants/render";
import { clamp } from "../utils/utils";

interface HazeProps {
  position: THREE.Vector3
  texture: THREE.Texture
  material: THREE.SpriteMaterial
}

const Haze: React.FC<HazeProps> = ({ position, material }) => {
  const spriteRef = useRef<THREE.Sprite>(null);


  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.layers.set(BASE_LAYER);
      spriteRef.current.scale.multiplyScalar(clamp(HAZE_MAX * Math.random(), HAZE_MIN, HAZE_MAX));
    }
  }, []);

  useFrame(({ camera }) => {
    if (spriteRef.current) {
      const dist = position.distanceTo(camera.position) / 250;
      spriteRef.current.material.opacity = clamp(HAZE_OPACITY * Math.pow(dist / 2.5, 2), 0, HAZE_OPACITY);
      spriteRef.current.material.needsUpdate = true;
    }
  });

  return <sprite ref={spriteRef} position={position} material={material} />;
};

export default Haze;
