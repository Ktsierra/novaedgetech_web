import { useContext } from "react";
import { GalaxyContext } from "../context/GalaxyContext";

const useGalaxyRef = () => {
  const context = useContext(GalaxyContext);
  if (context === undefined) {
    throw new Error('useGalaxyRef must be used within a GalaxyProvider');
  }
  return context;
};

export default useGalaxyRef;
