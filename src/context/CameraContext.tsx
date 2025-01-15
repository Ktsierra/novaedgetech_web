import { createContext, Dispatch, useState } from "react";



interface CameraContextProps{
    cameraPosition: number[] | null
    setCameraPosition: Dispatch<React.SetStateAction<number[] | null>>
}


const CameraContext = createContext<CameraContextProps>({
  cameraPosition: null,
  setCameraPosition: () => null
});

const CameraProvider = ({ children } : { children: React.ReactNode }) => {

  const [cameraPosition, setCameraPosition] = useState<number[] | null>([0, 500, 500]);

  return (
    <CameraContext.Provider value={{ cameraPosition, setCameraPosition }}>
      {children}
    </CameraContext.Provider>
  );
};

export { CameraContext, CameraProvider };
