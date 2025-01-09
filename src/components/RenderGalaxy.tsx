import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Galaxy() {
  const ref = useRef<THREE.Points>(null);

  useFrame(() => {
    ref.current.rotation.y += 0.001;
  });

  const particles = 10000;
  const positions = new Float32Array(particles * 3);
  const colors = new Float32Array(particles * 3);

  for (let i = 0; i < particles; i++) {
    const i3 = i * 3;

    const radius = Math.random() * 100;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    const color = new THREE.Color(
      Math.random() * 0.5 + 0.5,
      Math.random() * 0.5 + 0.5,
      1
    );
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return (
    <points ref={ref}>
      <pointsMaterial
        size={0.5}
        sizeAttenuation={true}
        vertexColors={true}
      />
      <bufferGeometry attach="geometry" {...geometry} />
    </points>
  );
}

function RenderedGalaxy() {
  return (
    <Canvas>
      <Galaxy />
    </Canvas>
  );
}

export default RenderedGalaxy;