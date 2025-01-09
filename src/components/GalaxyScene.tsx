// GalaxyScene.jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { Suspense } from 'react';
import Galaxy from './Galaxy';

function GalaxyScene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 5], fov: 75 }}
      style={{ width: '100%', height: '100vh' }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >

      {/* Ambient and point lights for basic illumination */}
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#4477ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4477ff" />

      {/* Add volumetric lighting */}
      <fog attach="fog" args={['#000000', 5, 15]} />

      <Suspense fallback={null}>
        <Galaxy />
        {/* Post-processing effects */}
        <EffectComposer>
          <ToneMapping />
          <Bloom
            intensity={2}
            luminanceThreshold={0.2}
            luminanceSmoothing={1.5}
          />

        </EffectComposer>
      </Suspense>

      <OrbitControls />

    </Canvas>
  );
}

export default GalaxyScene;