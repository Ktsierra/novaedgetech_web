import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

function Galaxy() {
  const galaxyRef = useRef<THREE.Points>(null);
  const { scene } = useGLTF('/src/assets/galaxy.glb');

  useEffect(() => {
    if (!scene?.children[0]) return;

    try {
      // Create custom material with enhanced properties
      const material = new THREE.PointsMaterial({
        size: 0.015,
        sizeAttenuation: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.8
      });

      const geometry = new THREE.BufferGeometry();
      const positions = scene.children[0].geometry.attributes.position.array;
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const colors = new Float32Array(positions.length);

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const distance = Math.sqrt(x * x + y * y + z * z);
        const maxDistance = 5;
        const intensity = Math.max(0, 1 - (distance / maxDistance));

        // Core: bright white-blue
        if (distance < maxDistance * 0.2) {
          colors[i] = 1.0; // R
          colors[i + 1] = 1.0; // G
          colors[i + 2] = 1.0; // B
        }
        // Middle region: blue-white transition
        else if (distance < maxDistance * 0.6) {
          colors[i] = 0.8 * intensity; // R
          colors[i + 1] = 0.9 * intensity; // G
          colors[i + 2] = 1.0; // B
        }
        // Outer region: darker blue
        else {
          colors[i] = 0.2 * intensity; // R
          colors[i + 1] = 0.5 * intensity; // G
          colors[i + 2] = 1.0 * intensity; // B
        }
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      // Create multiple particle systems for depth
      const corePoints = new THREE.Points(geometry, material);
      const glowPoints = new THREE.Points(geometry, new THREE.PointsMaterial({
        size: 0.03,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.2,
        color: new THREE.Color(0x4444ff)
      }));

      scene.clear();
      scene.add(corePoints);
      scene.add(glowPoints);
    } catch (error) {
      console.error('Error creating galaxy:', error);
    }
  }, [scene]);

  useFrame(({ clock }) => {
    if (galaxyRef.current) {
      galaxyRef.current.rotation.y += 0.0002;
      // Add subtle wobble
      galaxyRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.05;
    }
  });

  return <primitive object={scene} ref={galaxyRef} />;
}

export default Galaxy;
