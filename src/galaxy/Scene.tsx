/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Galaxy from './Galaxy';
import { PerformanceMonitor } from '@react-three/drei';
import RenderPipeline from './RenderPipeline';
import CameraAnimation from './CameraAnimation';
import useCamera from '../hooks/useCamera';
import { useState } from 'react';

function Scene() {

  const { cameraPosition } = useCamera();
  const [dpr, setDpr] = useState(1.25);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute' }}>
      <Canvas
        dpr={dpr}
        gl={{
          antialias: true,
        }}
        camera={{
          position: [0, 750, 750],
          up: [0, 0, 1],
          far: 5000000 }}

        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.5;
        }}
      >
        <PerformanceMonitor
          onIncline={() => { setDpr(1.5); }}
          onDecline={() => { setDpr(1); }}
        >
          <fogExp2 attach="fog" args={[0xEBE2DB, 0.00003]} />
          <Galaxy />
          <RenderPipeline />
          <CameraAnimation targetPosition={cameraPosition} />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

export default Scene;
