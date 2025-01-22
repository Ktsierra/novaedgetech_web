/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Galaxy from './Galaxy';
import RenderPipeline from './RenderPipeline';
import CameraAnimation from './CameraAnimation';
import useCamera from '../hooks/useCamera';
import { PerformanceMonitor, Stats } from '@react-three/drei';
import { useState } from 'react';

function Scene() {

  // const [cameraPosition, setCameraPosition] = useState<number[]>([0, 500, 500]);
  const { cameraPosition } = useCamera();
  const [dpt, setDpt] = useState(1);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute' }}>
      <Canvas
        dpr={dpt}
        // frameloop='demand'
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
          onDecline={()=> {setDpt(1);}}
          onIncline={()=> {setDpt(2);}}
        >

          <Stats />
          <fogExp2 attach="fog" args={[0xEBE2DB, 0.00003]} />
          {/*       <OrbitControls
          enableDamping
          dampingFactor={0.05}
          screenSpacePanning={false}
          minDistance={1}
          maxDistance={16384}
          maxPolarAngle={(Math.PI / 2) - (Math.PI / 360)}
        />
        <axesHelper args={[5.0]} />
        */}
          <Galaxy />
          <RenderPipeline />
          <CameraAnimation targetPosition={cameraPosition} />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

export default Scene;
