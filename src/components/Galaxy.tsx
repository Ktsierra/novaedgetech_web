import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';


function Galaxy() {
  const galaxyRef = useRef<THREE.Object3D>(null);
  const { scene } = useGLTF('/src/assets/galaxy.glb');

  useEffect(() => {
    addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.log('WebGL context lost');

    });

  }, []);

  useFrame(() => {
    if (galaxyRef.current) {
      // Slower rotation for more natural movement
      galaxyRef.current.rotation.y += 0.0005;
    }
  });

  // return <primitive ref={galaxyRef} object={scene} />
  return (
    <primitive object={scene} ref={galaxyRef} />
  );
}

export default Galaxy;

