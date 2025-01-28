import { createContext, useRef } from "react";
import * as THREE from 'three';

interface GalaxyContextProps {
    galaxyRef: React.RefObject<THREE.Group>;

}

const GalaxyContext = createContext<GalaxyContextProps | undefined>(undefined);

const GalaxyProvider = ({ children } : { children: React.ReactNode }) => {
    const galaxyRef = useRef<THREE.Group>(null);
  return (
    <GalaxyContext.Provider value={{ galaxyRef }}>
      {children}
    </GalaxyContext.Provider>
  );
};

export { GalaxyContext, GalaxyProvider };
