import { createContext, Dispatch, SetStateAction, useState } from "react";

interface CameraContextProps{
    cameraPosition: [number, number, number]
    setCameraPosition: Dispatch<SetStateAction<[number, number, number]>>
    starSelected: boolean
    setStarSelected: Dispatch<SetStateAction<boolean>>
    starIndex: number
    setStarIndex: Dispatch<SetStateAction<number>>
}

const CameraContext = createContext<CameraContextProps | undefined>(undefined);

const CameraProvider = ({ children } : { children: React.ReactNode }) => {

  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 500, 500]);
  const [starSelected, setStarSelected] = useState<boolean>(false);
  const [starIndex, setStarIndex] = useState<number>(0);

  return (
    <CameraContext.Provider value={{ cameraPosition, starSelected, starIndex, setCameraPosition, setStarSelected, setStarIndex }}>
      {children}
    </CameraContext.Provider>
  );
};

export { CameraContext, CameraProvider };
