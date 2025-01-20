import React, { useRef, useMemo } from 'react';
// import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Star from './Star';
import Haze from './Haze';
import { ARMS, ARM_X_DIST, ARM_X_MEAN, ARM_Y_DIST, ARM_Y_MEAN,
  CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS, HAZE_RATIO, NUM_STARS,
  OUTER_CORE_X_DIST, OUTER_CORE_Y_DIST } from '../constants/galaxy';
import { gaussianRandom, spiral } from '../utils/utils';
import { Html } from '@react-three/drei';
import GalaxyButton from './GalaxyButton';
import useCamera from '../hooks/useCamera';
import useLoading from '../hooks/useLoading';

interface ReferencePoint {
  position: THREE.Vector3;
  title: string;
}

const Galaxy: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { starSelected, setStarSelected, setCameraPosition } = useCamera();
  const { setLoading } = useLoading();

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

    const initialReferencePoints: ReferencePoint[] = [
      {
        position: new THREE.Vector3(
          ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
          ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
          gaussianRandom(0, GALAXY_THICKNESS / 2)
        ),
        title: "About"
      },
      {
        position: new THREE.Vector3(
          -ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
          ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
          gaussianRandom(0, GALAXY_THICKNESS / 2)
        ),
        title: "Team"
      },
      {
        position: new THREE.Vector3(
          ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
          -ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
          gaussianRandom(0, GALAXY_THICKNESS / 2)
        ),
        title: "Projects"
      },
      {
        position: new THREE.Vector3(
          -ARM_X_MEAN + gaussianRandom(0, ARM_X_DIST / 8),
          -ARM_Y_MEAN + gaussianRandom(0, ARM_Y_DIST / 8),
          gaussianRandom(0, GALAXY_THICKNESS / 2)
        ),
        title: "Contact"
      }
    ];

    const allStars = generateObjects(NUM_STARS, (pos) => ({
      position: pos,
      isReference: false
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

    setTimeout(() => { setLoading(false); }, 7000);

    return { stars, haze, referencePoints };
  }, [setLoading]);

  /*   useFrame(({ camera }) => {
    if (groupRef.current) {
      //camera.far = 5000000;
      // Update scales here if needed
    }
  }); */

  return (
    <>
      <group ref={groupRef} onClick={() => {
        if (!starSelected) return;
        setStarSelected(false);
        setCameraPosition([0, 500, 500]);
      }}>
        {stars.map((star, index) => (
          <Star
            key={`star-${index.toString()}`}
            position={star.position}
          />
        ))}
        {haze.map((hazeItem, index) => (
          <Haze key={`haze-${index.toString()}`} position={hazeItem.position} />
        ))}
        {referencePoints.map((reference, index) => {
          const side = reference.position.x > 0 ? 'left' : 'right';
          return (
            <Html
              key={`button-${index.toString()}`}
              position={ side === 'left'
                ? reference.position
                : [reference.position.x, reference.position.y, reference.position.z]
              }
              style={{
                pointerEvents: 'none',
                userSelect: 'none', }}
              zIndexRange={[100, 0]}
            >
              <GalaxyButton
                title={reference.title}
                side= {side}
                onClick={() => {
                  setStarSelected(true);
                  setCameraPosition([reference.position.x, reference.position.y + 25, reference.position.z + 25]);
                }}
                styles={{ pointerEvents: 'auto' }}
              />
            </Html>
          );})}
      </group>
    </>
  );
};
export default Galaxy;
