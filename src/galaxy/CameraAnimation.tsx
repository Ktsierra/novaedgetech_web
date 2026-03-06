import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useCamera from "../hooks/useCamera";
import { useRef } from "react";
import useGalaxyRef from "../hooks/useGalaxyRef";

const _rotAxis = new THREE.Vector3(0, 0, 1);
const _defaultPos = new THREE.Vector3(0, 500, 500);

function CameraAnimation({ targetPosition }: {
  targetPosition: [number, number, number]
}) {
  const { galaxyRef } = useGalaxyRef();
  const { camera } = useThree();
  const { starSelected } = useCamera();
  const targetVec = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3(0, 25, 25));
  const lerpFactor = useRef(0.02);

  const _worldPos = useRef(new THREE.Vector3());
  const _lookAt = useRef(new THREE.Vector3());
  const _tempOffset = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!galaxyRef.current) return;

    if (starSelected) {
      const rotationZ = galaxyRef.current.rotation.z;
      _tempOffset.current.copy(offset.current).applyAxisAngle(_rotAxis, rotationZ);
      _worldPos.current.set(...targetPosition)
        .applyMatrix4(galaxyRef.current.matrixWorld)
        .add(_tempOffset.current);

      const distanceToTarget = camera.position.distanceTo(_worldPos.current);
      if (distanceToTarget < 100) {
        const oscillation = Math.sin(clock.getElapsedTime() * 0.5) * 2;
        _worldPos.current.y += oscillation;
      }

      targetVec.current.lerp(_worldPos.current, lerpFactor.current);
      camera.position.lerp(targetVec.current, 0.02);

      _lookAt.current.set(...targetPosition)
        .applyMatrix4(galaxyRef.current.matrixWorld);
      _lookAt.current.x += Math.cos(rotationZ) * 10;
      _lookAt.current.y += Math.sin(rotationZ) * 10;

      camera.lookAt(_lookAt.current);
    } else {
      camera.position.lerp(_defaultPos, 0.1);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

export default CameraAnimation;
