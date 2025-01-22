
import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import Star from './Star';
import Haze from './Haze';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN,
  CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, HAZE_RATIO, NUM_STARS,
  OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST } from '../constants/galaxy';
import { clamp, gaussianRandom, spiral } from '../utils/utils';
import { Html } from '@react-three/drei';
import GalaxyButton from './GalaxyButton';
import useCamera from '../hooks/useCamera';
import useLoading from '../hooks/useLoading';
import { useFrame, useLoader } from '@react-three/fiber';
import sprite120 from '../assets/sprite120.png';
import feathered from '../assets/feathered60.png';
import { BLOOM_LAYER, HAZE_OPACITY, STAR_MAX, STAR_MIN } from '../constants/render';
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

const Galaxy: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [swapSide, setSwapSide] = useState(false);
  const { starSelected, setStarSelected, setCameraPosition } = useCamera();
  const { setLoading } = useLoading();
  const starTexture = useLoader(THREE.TextureLoader, sprite120);
  const hazeTexture = useLoader(THREE.TextureLoader, feathered);

  const hazeMaterial = new THREE.SpriteMaterial({
    transparent: true,
    map: hazeTexture,
    color: 0x0082ff,
    opacity: HAZE_OPACITY,
    depthTest: false,
    depthWrite: false,
  });

  const starMeshRef = useRef<THREE.InstancedMesh>(null);
  const starGeometry = new THREE.PlaneGeometry(1, 1);
  const starMaterial = new THREE.MeshBasicMaterial({
    map: starTexture,
    transparent: true,
    depthWrite: false,
    vertexColors: true
  });



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
        position :nearestStar.position.clone()
      };
    });

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


  // In Galaxy.tsx
// In Galaxy.tsx
const colorAttribute = useMemo(() => {
  const colors = new Float32Array(NUM_STARS * 3); // RGB for each star
  stars.forEach((star, i) => {
    const color = new THREE.Color(starTypes.color[star.starType]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  });
  return new THREE.BufferAttribute(colors, 3);
}, [stars]);

// Attach color attribute to geometry
starGeometry.setAttribute('color', colorAttribute);

  //
  useEffect(() => {
    if (starMeshRef.current) {
      starMeshRef.current.layers.set(BLOOM_LAYER);
      const matrix = new THREE.Matrix4();
      stars.forEach((star, i) => {
        matrix.setPosition(star.position.x, star.position.y, star.position.z);
        matrix.scale(new THREE.Vector3(starTypes.size[starTypes.size[star.starType]], starTypes.size[star.starType], 1));
        if (starMeshRef.current) {
          starMeshRef.current.setMatrixAt(i, matrix);
        }
      });
      starMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [stars]);
  //

  /*   useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.65;

      const invertSide = groupRef.current.rotation.z % (2 * Math.PI);
      if (invertSide > Math.PI - 0.05 && invertSide < Math.PI + 0.05) {
        setSwapSide(true);
      } else if (invertSide > 2 * Math.PI - 0.05 && invertSide < 2 * Math.PI + 0.05) {
        setSwapSide(false);
      }
    }
  }); */

  useFrame(({ camera }, delta) => {

    if (!groupRef.current) return;
    groupRef.current.rotation.z += delta * 0.65;

    if (!starMeshRef.current) return;
    const matrix = new THREE.Matrix4();
    stars.forEach((star, i) => {
      const dist = star.position.distanceTo(camera.position) / 250;
      const scale = clamp(dist * starTypes.size[star.starType], STAR_MIN, STAR_MAX);
      matrix.makeScale(scale, scale, 1);
      matrix.setPosition(star.position.x, star.position.y, star.position.z);
      if (!starMeshRef.current) return;
      starMeshRef.current.setMatrixAt(i, matrix);
    });
    starMeshRef.current.instanceMatrix.needsUpdate = true;
  });


  return (
    <>
      <group ref={groupRef} onClick={() => {
        if (!starSelected) return;
        setStarSelected(false);
        setCameraPosition([0, 500, 500]);
      }}>
        <instancedMesh
          ref={starMeshRef}
          args={[starGeometry, starMaterial, NUM_STARS]}
        />
        {/*  {stars.map((star, index) => (
          <Star
            key={`star-${index.toString()}`}
            position={star.position}
            texture={starTexture}
          />
        ))} */}
        {haze.map((hazeItem, index) => (
          <Haze
            key={`haze-${index.toString()}`}
            position={hazeItem.position}
            texture={hazeTexture}
            material={hazeMaterial}
          />
        ))}
        {referencePoints.map((reference, index) => {
          const side = reference.position.x > 0 ? 'left' : 'right';
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
                swapSide={swapSide}
                title={reference.title}
                side={side}
                onClick={() => {
                  setStarSelected(true);
                  setCameraPosition([reference.position.x, reference.position.y + 25, reference.position.z + 25]);
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

