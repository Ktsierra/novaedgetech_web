/* eslint-disable react/no-unknown-property */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import useCamera from "../hooks/useCamera";
import useLoading from "../hooks/useLoading";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import sprite120 from '../assets/sprite120.png';
import { NUM_STARS } from "../constants/galaxy";
import { initialReferencePoints } from "../constants/referencePoints";
import { clamp, generateObjects, generateStarType } from "../utils/galaxyMath";
import { starTypes } from "../constants/stars";
import { BLOOM_LAYER, STAR_MAX, STAR_MIN } from "../constants/render";
import { Html } from "@react-three/drei";
import GalaxyButton from "./GalaxyButton";
import useGalaxyRef from "../hooks/useGalaxyRef";
import { Star, StarNoReference } from "../types/types";


const Stars = () => {
  const [buttonSides, setButtonSides] = useState<('left' | 'right')[]>([]);
  const { setStarSelected, setCameraPosition, setStarIndex } = useCamera();
  const { setLoading } = useLoading();
  const { galaxyRef } = useGalaxyRef();

  const starTexture = useLoader(THREE.TextureLoader, sprite120);
  const starMatrix = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const starMeshRef = useRef<THREE.InstancedMesh>(null);
  const starGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 8, 8), []);
  const starMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      map: starTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    }),
  [starTexture]);

  const { stars, referencePoints } = useMemo(() => {

    const allStars : StarNoReference[] =
      generateObjects(NUM_STARS, 'stars', (pos) => ({
        position: pos,
      }))
        .map((star) => ({
          ...star,
          starType: generateStarType(),
        }));

    const referencePoints = initialReferencePoints.map(refPoint=> {
      let nearestStar = allStars[0];
      let minDistance = (refPoint.position as THREE.Vector3).distanceTo(nearestStar.position as THREE.Vector3);
      allStars.forEach(star => {
        const distance = (refPoint.position as THREE.Vector3).distanceTo(star.position as THREE.Vector3);
        if (distance < minDistance) {
          minDistance = distance;
          nearestStar = star;
        }
      });

      return {
        ...refPoint,
        position: (nearestStar.position as THREE.Vector3).clone(),
        originalAngle: Math.atan2((nearestStar.position as THREE.Vector3).y, (nearestStar.position as THREE.Vector3).x)
      };
    });

    setButtonSides(referencePoints.map(ref =>
      (ref.originalAngle + Math.PI) % (2 * Math.PI) > Math.PI ? 'left' : 'right'
    ));

    const stars: Star[] = allStars.map(star => ({
      ...star,
      isReference: referencePoints.some(
        ref => (ref.position).equals(star.position as THREE.Vector3)
      )
    }));


    setLoading(false);

    return { stars, referencePoints };
  }, [setLoading]);

  const starColorAttribute = useMemo(() => {
    const colors = new Float32Array(NUM_STARS * 3);
    stars.forEach((star, i) => {
      new THREE.Color(starTypes.color[star.starType])
        .toArray(colors, i * 3);
    });
    return new THREE.InstancedBufferAttribute(colors, 3, false);
  }, [stars]);


  useLayoutEffect(() => {
    if (starMeshRef.current) {
      stars.forEach((star, i) => {
        starMatrix.current.setPosition(star.position as THREE.Vector3);
        starMeshRef.current?.setMatrixAt(i, starMatrix.current);
      });
      starMeshRef.current.layers.set(BLOOM_LAYER);
      starMeshRef.current.instanceColor = starColorAttribute;
      starMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [starGeometry, stars, starColorAttribute]);


  useFrame(({ camera }) => {
    if (starMeshRef.current) {
      stars.forEach((star, i) => {
        const dist = (star.position as THREE.Vector3).distanceTo(camera.position) / 250;
        const scale = clamp(dist * starTypes.size[star.starType], STAR_MIN, STAR_MAX);

        starMatrix.current.makeScale(scale, scale, scale);
        starMatrix.current.setPosition(star.position as THREE.Vector3);
        starMeshRef.current?.setMatrixAt(i, starMatrix.current);
      });

      starMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Invert side of galaxy button based on rotation
    const rotationZ = galaxyRef.current?.rotation.z ?? 0;
    const newSides = referencePoints.map(ref => {
      const currentAngle = (ref.originalAngle + rotationZ + Math.PI / 2) % (2 * Math.PI);
      return currentAngle < Math.PI ? 'left' : 'right';
    });
    setButtonSides(prev => JSON.stringify(prev) === JSON.stringify(newSides) ? prev : newSides);

  });

  return (
    <>
      <instancedMesh
        ref={starMeshRef}
        args={[starGeometry, starMaterial, NUM_STARS]}
      />
      {referencePoints.map((reference, index) => {
        const side = buttonSides[index];
        return (
          <Html
            key={`button-${index.toString()}`}
            position={reference.position}
            style={{
              pointerEvents: 'none',
              userSelect: 'none', }}
            zIndexRange={[100, 0]}
          >
            <GalaxyButton
              title={reference.title}
              side={side}
              onClick={() => {
                setStarSelected(true);
                setStarIndex(index);
                setCameraPosition([
                  reference.position.x,
                  reference.position.y,
                  reference.position.z
                ]);
              }}
              styles={{ pointerEvents: 'auto' }}
            />
          </Html>
        );
      })}
    </>
  );
};

export default Stars;