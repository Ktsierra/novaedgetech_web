// GalaxyScene.jsx
import { Canvas } from '@react-three/fiber'
import Galaxy from './Galaxy'

function GalaxyScene() {
  return (
    <Canvas
      camera={{ position: [5, 5, 10], fov: 8 }}
    >
      {/* Add more intense lighting for better visibility */}
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <directionalLight position={[-5, 5, 5]} intensity={1} />
      <Galaxy />
    </Canvas>
  )
}

export default GalaxyScene