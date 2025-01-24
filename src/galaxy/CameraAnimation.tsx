import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useCamera from "../hooks/useCamera";
import { useRef } from "react";
function CameraAnimation({ targetPosition, groupRef }: { targetPosition: [number, number, number], groupRef: React.RefObject<THREE.Group> }) {
  const { camera } = useThree();
  const { starSelected } = useCamera();
  const targetVec = useRef(new THREE.Vector3());

  /*     useEffect(() => {
        invalidate();
    }, [camera.position]);
     */
  useFrame(() => {
    if (starSelected && groupRef.current) {
      // Convert local position to world position
      const worldPosition = new THREE.Vector3(...targetPosition)
        .applyMatrix4(groupRef.current.matrixWorld);

      // Add camera offset relative to galaxy rotation
      const offset = new THREE.Vector3(0, 25, 25)
        .applyQuaternion(groupRef.current.quaternion);

      targetVec.current.copy(worldPosition).add(offset);
    } else {
      targetVec.current.set(...targetPosition);
    }

    camera.position.lerp(targetVec.current, 0.1);
    camera.lookAt(targetVec.current.clone().sub(new THREE.Vector3(0, 25, 25)));
  });

  return null;
}

export default CameraAnimation;
