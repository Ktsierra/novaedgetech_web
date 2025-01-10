/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Galaxy from './Galaxy';
import RenderPipeline from './RenderPipeline';

function Scene() {
  return (
    <Canvas
      style={{ width: '100%', height: '100vh' }}
      gl={{
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true,
        premultipliedAlpha: false
      }}
      camera={{ position: [0, 500, 500], up: [0, 0, 1], far: 5000000 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.5;
        gl.setClearColor(0x000000, 0); // Set clear color to black with 0 alpha
      }}
    >
      <fogExp2 attach="fog" args={[0xEBE2DB, 0.00003]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        screenSpacePanning={false}
        minDistance={1}
        maxDistance={16384}
        maxPolarAngle={(Math.PI / 2) - (Math.PI / 360)}
      />
      <axesHelper args={[5.0]} />
      <Galaxy />
      <RenderPipeline />
    </Canvas>
  );
}

export default Scene;
