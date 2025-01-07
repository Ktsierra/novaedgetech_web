// Galaxy.jsx
import { useEffect, useState } from 'react'
import { useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

function Galaxy() {
  const [isLoading, setIsLoading] = useState(true)
  
  try {
    // Log the attempted model path
    const modelPath = new URL('../assets/galaxy.obj', import.meta.url).href
    console.log('Attempting to load model from:', modelPath)
    
    const obj = useLoader(OBJLoader, modelPath)

    useEffect(() => {
      if (obj) {
        console.log('Model loaded successfully:', obj)
        obj.position.set(0, 0, 0)

        // Ensure the model is visible in the camera's view
        obj.scale.set(0.5, 0.5, 0.5) // Try a smaller scale
        setIsLoading(false)
      }
    }, [obj])

    if (isLoading) {
      // Render a placeholder while loading
      return (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      )
    }

    return (
      <primitive
        object={obj}
        scale={0.5}
        position={[0, 0, 0]}
      />
    )
  } catch (err) {
    console.error('Error loading model:', err)
    // Render a different colored box to indicate error
    return (
      <mesh position={[0, 0, 0]} >
        <boxGeometry args={[1, 1, 1]}  />
        <meshStandardMaterial color="yellow" />
      </mesh>
    )
  }
}

export default Galaxy