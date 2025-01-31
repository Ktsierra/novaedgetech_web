
import React, { useRef } from 'react';
import useCamera from '../hooks/useCamera';
import { useFrame } from '@react-three/fiber';
import Haze from './Haze';
import Stars from './Stars';
import useGalaxyRef from '../hooks/useGalaxyRef';
import { HazeProps } from '../types/types';
import { colors } from '../constants/colors';

const Galaxy: React.FC = () => {
  const { galaxyRef } = useGalaxyRef();
  const { starSelected, setStarSelected, setCameraPosition } = useCamera();
  const hazeOutCenter = useRef<HazeProps>({
    direction: -1,
    color: colors.red, // red
    cluster : 'center'
  });

  const hazeStaticPeriphery = useRef<HazeProps>({
    direction: 0,
    color: colors.purple, // purple
    cluster : 'periphery'
  });

  const hazeInArms = useRef<HazeProps>({
    direction: 1,
    color: colors.blue, // blue
    cluster : 'arms'
  });

  useFrame((_, delta) => {
    if (galaxyRef.current) {
      galaxyRef.current.rotation.z += delta * (starSelected ? 0 : 0.05);
    }
  });

  return (
    <>
      <group
        ref={galaxyRef}
        onClick={() => {
          if (!starSelected) return;
          setStarSelected(false);
          setCameraPosition([0, 500, 500]);
        }}>
        <Stars />
        <Haze {...hazeOutCenter.current} />
        <Haze {...hazeStaticPeriphery.current} />
        <Haze {...hazeInArms.current} />
      </group>
    </>
  );
};

export default Galaxy;