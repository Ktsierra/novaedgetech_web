/* eslint-disable react/no-unknown-property */

import React, { useRef, useMemo, useState, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN,
  CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, HAZE_RATIO, NUM_STARS,
  OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST } from '../constants/galaxy';
import { clamp, gaussianRandom, spiral, hazeScale } from '../utils/galaxyMath';
import { Html } from '@react-three/drei';
import GalaxyButton from './GalaxyButton';
import useCamera from '../hooks/useCamera';
import useLoading from '../hooks/useLoading';
import { useFrame, useLoader } from '@react-three/fiber';
import sprite120 from '../assets/sprite120.png';
import feathered from '../assets/feathered60.png';
import { BASE_LAYER, BLOOM_LAYER, HAZE_OPACITY, STAR_MAX, STAR_MIN } from '../constants/render';
import { starTypes } from "../constants/stars";

interface ReferencePoint {
  position: THREE.Vector3;
  title: string;
}

const initialReferencePoints: ReferencePoint[] = [
  {
    position: new THREE.Vector3(
      ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
      ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
      gaussianRandom(0, GALAXY_THICKNESS / 2)
    ),
    title: "About",

  },
  {
    position: new THREE.Vector3(
      -ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
      ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
      gaussianRandom(0, GALAXY_THICKNESS / 2)
    ),
    title: "Team",
  },
  {
    position: new THREE.Vector3(
      ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
      -ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
      gaussianRandom(0, GALAXY_THICKNESS / 2)
    ),
    title: "Projects",
  },
  {
    position: new THREE.Vector3(
      -ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
      -ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
      gaussianRandom(0, GALAXY_THICKNESS / 2)
    ),
    title: "Contact",
  }
];

const Galaxy: React.FC< { groupRef: React.RefObject<THREE.Group> }> = ({ groupRef }) => {
  
  const [buttonSides, setButtonSides] = useState<('left' | 'right')[]>([]);
  const { starSelected, setStarSelected, setCameraPosition } = useCamera();
  const { setLoading } = useLoading();

  // used in useFrame
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

  const hazeTexture = useLoader(THREE.TextureLoader, feathered);
  const hazeMatrix = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const hazeMeshRef = useRef<THREE.InstancedMesh>(null);
  const hazeGeometry = useMemo(() => new THREE.CircleGeometry(), []);
  const hazeWaveDir = useRef< { 'out': number, 'static': number, 'in': number }>({
    'out' : -1,
    'static' : 0,
    'in' : 1
  });
  const hazeMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({
      map: hazeTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      opacity: HAZE_OPACITY,
      color: 0x0082ff
    }),
  [hazeTexture]);

  const { stars, haze, referencePoints } = useMemo(() => {
    const generateObjects = (numStars: number, generator: (pos: THREE.Vector3) => { position: THREE.Vector3 }) => {
      const objects = [];

      for (let i = 0; i < numStars / 4; i++) {
        const pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
        objects.push(generator(pos));
      }

      for (let i = 0; i < numStars / 4; i++) {
        const pos = new THREE.Vector3(gaussianRandom(0, OUTER_CORE_X_DIST), gaussianRandom(0, OUTER_CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
        objects.push(generator(pos));
      }

      for (let j = 0; j < ARMS; j++) {
        for (let i = 0; i < numStars / 4; i++) {
          const pos = spiral(gaussianRandom(ARM_X_MEAN, ARM_X_DIST), gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS), j * 2 * Math.PI / ARMS);
          objects.push(generator(pos));
        }
      }

      return objects;
    };

    const generateStarType = () => {
      let num = Math.random() * 100.0;
      const pct = starTypes.percentage;
      for (let i = 0; i < pct.length; i++) {
        num -= pct[i];
        if (num < 0) return i;
      }
      return 0;
    };

    const allStars =
      generateObjects(NUM_STARS, (pos) => ({
        position: pos,
      }))
        .map((star) => ({
          ...star,
          starType: generateStarType(),
        }));



    const referencePoints = initialReferencePoints.map(refPoint => {
      let nearestStar = allStars[0];
      let minDistance = refPoint.position.distanceTo(nearestStar.position);

      allStars.forEach(star => {
        const distance = refPoint.position.distanceTo(star.position);
        if (distance < minDistance) {
          minDistance = distance;
          nearestStar = star;
        }
      });

      return {
        ...refPoint,
        position :nearestStar.position.clone(),
        originalAngle: Math.atan2(nearestStar.position.y, nearestStar.position.x)
      };
    });

    setButtonSides(referencePoints.map(ref =>
      (ref.originalAngle + Math.PI) % (2 * Math.PI) > Math.PI ? 'left' : 'right'
    ));

    const stars = allStars.map(star => ({
      ...star,
      isReference: referencePoints.some(
        ref => ref.position.equals(star.position)
      )
    }));

    const haze = generateObjects(NUM_STARS * HAZE_RATIO, (pos) => ({ position: pos }));

    setLoading(false);

    return { stars, haze, referencePoints };
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
    if (!starMeshRef.current || !hazeMeshRef.current) return;

    // Stars
    stars.forEach((star, i) => {
      starMatrix.current.setPosition(star.position);
      starMeshRef.current?.setMatrixAt(i, starMatrix.current);
    });
    starMeshRef.current.layers.set(BLOOM_LAYER);
    starMeshRef.current.instanceColor = starColorAttribute;
    starMeshRef.current.instanceMatrix.needsUpdate = true;

    // Haze
    haze.forEach((hazeItem, i) => {
      hazeMatrix.current.setPosition(hazeItem.position);
      hazeMeshRef.current?.setMatrixAt(i, hazeMatrix.current);
    });
    hazeMeshRef.current.layers.set(BASE_LAYER);
    hazeMeshRef.current.instanceMatrix.needsUpdate = true;


  }, [ starGeometry, stars, haze, hazeGeometry, starColorAttribute]);

  useFrame(({ camera, clock }, delta) => {
    if (
      !groupRef.current ||
      !starMeshRef.current ||
      !hazeMeshRef.current
    ) return;

    groupRef.current.rotation.z += delta * (starSelected ? 0 : 0.05);
    const rotationZ = groupRef.current.rotation.z;
    const time = clock.getElapsedTime();

    // Stars
    stars.forEach((star, i) => {
      const dist = star.position.distanceTo(camera.position) / 250;
      const scale = clamp(dist * starTypes.size[star.starType], STAR_MIN, STAR_MAX);

      starMatrix.current.makeScale(scale, scale, scale);
      starMatrix.current.setPosition(star.position);

      starMeshRef.current?.setMatrixAt(i, starMatrix.current);
    });
    starMeshRef.current.instanceMatrix.needsUpdate = true;

    //Haze
    haze.forEach((hazeItem, i) => {
      const dist = hazeItem.position.distanceTo(camera.position) / 250;
      const opacity = clamp(HAZE_OPACITY * Math.pow(dist / 2.5, 2), 0, HAZE_OPACITY);
      const distanceFromCenter = new THREE.Vector2(hazeItem.position.x, hazeItem.position.y).length();
      const scale = hazeScale(time,distanceFromCenter, hazeWaveDir.current.out);

      hazeMaterial.opacity = opacity;
      hazeMatrix.current.makeScale(scale, scale, scale); 
      hazeMatrix.current.setPosition(hazeItem.position);
      hazeMeshRef.current?.setMatrixAt(i, hazeMatrix.current);
    });

    hazeMeshRef.current.instanceMatrix.needsUpdate = true;


    // Invert side of galaxy button based on rotation
    const newSides = referencePoints.map(ref => {
      const currentAngle = (ref.originalAngle + rotationZ + Math.PI / 2) % (2 * Math.PI);
      return currentAngle < Math.PI ? 'left' : 'right';
    });
    setButtonSides(prev => JSON.stringify(prev) === JSON.stringify(newSides) ? prev : newSides);

  });


  return (
    <>
      <group
        ref={groupRef}
        onClick={() => {
          if (!starSelected) return;
          setStarSelected(false);
          setCameraPosition([0, 500, 500]);
        }}>
        <instancedMesh
          ref={starMeshRef}
          args={[starGeometry, starMaterial, NUM_STARS]}
        />
        <instancedMesh
          ref={hazeMeshRef}
          args={[hazeGeometry, hazeMaterial, NUM_STARS * HAZE_RATIO]}
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
      </group>
    </>
  );
};
export default Galaxy;

