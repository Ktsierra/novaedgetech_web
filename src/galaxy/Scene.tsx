/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Galaxy from './Galaxy';
import RenderPipeline from './RenderPipeline';
import CameraAnimation from './CameraAnimation';
import { useContext } from 'react';
import { CameraContext } from '../context/CameraContext';

function Scene() {

  // const [cameraPosition, setCameraPosition] = useState<number[]>([0, 500, 500]);
  const { cameraPosition } = useContext(CameraContext);


  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute' }}>
      <Canvas
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
        <CameraAnimation targetPosition={cameraPosition ?? [0, 500, 500]} />
      </Canvas>
    </div>
  );
}

export default Scene;
