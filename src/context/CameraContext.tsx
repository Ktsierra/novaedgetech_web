import { createContext, Dispatch, useState } from "react";



interface CameraContextProps{
    cameraPosition: number[] | null
    setCameraPosition: Dispatch<React.SetStateAction<number[] | null>>
    starSelected: boolean
    setStarSelected: Dispatch<React.SetStateAction<boolean>>
}


const CameraContext = createContext<CameraContextProps>({
  cameraPosition: null,
  setCameraPosition: () => null,
  starSelected: false,
  setStarSelected: () => null

});

const CameraProvider = ({ children } : { children: React.ReactNode }) => {

  const [cameraPosition, setCameraPosition] = useState<number[] | null>([0, 500, 500]);
  const [starSelected, setStarSelected] = useState(false);

  return (
    <CameraContext.Provider value={{ cameraPosition, starSelected, setCameraPosition, setStarSelected }}>
      {children}
    </CameraContext.Provider>
  );
};

export { CameraContext, CameraProvider };
