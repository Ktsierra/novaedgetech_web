/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { BLOOM_LAYER, STAR_MAX, STAR_MIN } from '../constants/render';
import { starTypes } from '../constants/stars';
import { clamp } from '../utils/utils';
import sprite120 from '../assets/sprite120.png';

interface StarProps {
  position: THREE.Vector3
}

const Star: React.FC<StarProps> = ({ position }) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useLoader(THREE.TextureLoader, sprite120);


  const { starType, material } = useMemo(() => {
    const generateStarType = () => {
      let num = Math.random() * 100.0;
      const pct = starTypes.percentage;
      for (let i = 0; i < pct.length; i++) {
        num -= pct[i];
        if (num < 0) return i;
      }
      return 0;
    };

    const starType = generateStarType();
    const material = new THREE.SpriteMaterial({ map: texture, color: starTypes.color[starType], transparent: true });

    return { starType, material };
  }, [texture]);

  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.layers.set(BLOOM_LAYER);
      spriteRef.current.scale.multiplyScalar(starTypes.size[starType]);
    }
  }, [starType]);

  useFrame(({ camera }) => {
    if (spriteRef.current) {
      const dist = position.distanceTo(camera.position) / 250;
      const starSize = clamp(dist * starTypes.size[starType], STAR_MIN, STAR_MAX);
      spriteRef.current.scale.set(starSize, starSize, starSize);
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={position}
      material={material} />
  );
};

export default Star;
