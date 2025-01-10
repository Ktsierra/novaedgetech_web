/* eslint-disable react/no-unknown-property */
import React, { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { BASE_LAYER, HAZE_MAX, HAZE_MIN, HAZE_OPACITY } from "../constants/render";
import { clamp } from "../utils/utils";
import feathered from '../assets/feathered60.png';

interface HazeProps {
  position: THREE.Vector3
}

const Haze: React.FC<HazeProps> = ({ position }) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useLoader(THREE.TextureLoader, feathered);

  const spriteMaterial = new THREE.SpriteMaterial({
    transparent: true,
    map: texture,
    color: 0x0082ff,
    opacity: HAZE_OPACITY,
    depthTest: false,
    depthWrite: false
  });

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

  return <sprite ref={spriteRef} position={position} material={spriteMaterial} />;
};

export default Haze;
