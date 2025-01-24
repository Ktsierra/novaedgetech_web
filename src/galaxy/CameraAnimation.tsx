import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useCamera from "../hooks/useCamera";
import { useRef } from "react";
function CameraAnimation({ targetPosition, groupRef }: {
  targetPosition: [number, number, number],
  groupRef: React.RefObject<THREE.Group>
}) {
  const { camera } = useThree();
  const { starSelected } = useCamera();
  const targetVec = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3(0, 25, 25));
  const lerpFactor = useRef(0.02); // Slower follow speed

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    if (starSelected) {
      const rotationZ = groupRef.current.rotation.z;
      const rotatedOffset = offset.current.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), rotationZ);
      const worldPosition = new THREE.Vector3(...targetPosition).applyMatrix4(groupRef.current.matrixWorld).add(rotatedOffset);

      // Apply oscillation only when zoomed in
      const distanceToTarget = camera.position.distanceTo(worldPosition);
      if (distanceToTarget < 100) { // Adjust this threshold as needed
        const oscillation = Math.sin(clock.getElapsedTime() * 0.5) * 2;
        worldPosition.y += oscillation;
      }

      targetVec.current.lerp(worldPosition, lerpFactor.current);
      camera.position.lerp(targetVec.current, 0.02);

      const lookAtPosition = new THREE.Vector3(...targetPosition)
        .applyMatrix4(groupRef.current.matrixWorld)
        .add(new THREE.Vector3(Math.cos(rotationZ) * 10, Math.sin(rotationZ) * 10, 0));

      camera.lookAt(lookAtPosition);
    } else {
      camera.position.lerp(new THREE.Vector3(0, 500, 500), 0.1);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}


export default CameraAnimation;
