import { createContext, useState } from "react";



interface CameraContextProps{
    cameraPosition: number[]
    setCameraPosition: (newPosition: number[]) => void
}


const CameraContext = createContext<CameraContextProps>({
    cameraPosition: [0, 500, 500],
    setCameraPosition: () => {}
});

const CameraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

const [cameraPosition, setCameraPosition] = useState([0, 500, 500]);

  return (
    <CameraContext.Provider value={{ cameraPosition, setCameraPosition }}>
      {children}
    </CameraContext.Provider>
  );
};

export { CameraContext, CameraProvider };
  