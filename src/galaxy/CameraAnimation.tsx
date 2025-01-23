import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
function CameraAnimation({ targetPosition }: { targetPosition: number[] }) {
  const { camera } = useThree();


  /*     useEffect(() => {
        invalidate();
    }, [camera.position]);
     */
  useFrame(() => {
    camera.position.lerp(new THREE.Vector3(...targetPosition), .02);
  });

  return null;
}

export default CameraAnimation;
