import { createContext, Dispatch, SetStateAction, useState } from "react";

interface CameraContextProps{
    cameraPosition: [number, number, number]
    setCameraPosition: Dispatch<SetStateAction<[number, number, number]>>
    starSelected: boolean
    setStarSelected: Dispatch<SetStateAction<boolean>>
}

const CameraContext = createContext<CameraContextProps | undefined>(undefined);

const CameraProvider = ({ children } : { children: React.ReactNode }) => {

  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 500, 500]);
  const [starSelected, setStarSelected] = useState(false);

  return (
    <CameraContext.Provider value={{ cameraPosition, starSelected, setCameraPosition, setStarSelected }}>
      {children}
    </CameraContext.Provider>
  );
};

export { CameraContext, CameraProvider };
