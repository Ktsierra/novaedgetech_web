import { useState, useEffect, createContext } from "react";


interface StackedContextProps {
    stacked: boolean;
    setStacked: React.Dispatch<React.SetStateAction<boolean>>;
}

const StackedContext = createContext<StackedContextProps | undefined>(undefined);

const StackedContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [stacked, setStacked] = useState(() => window.innerWidth <= 800);

  useEffect(() => {
    const handleResize = () => {
      setStacked(window.innerWidth <= 800);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <StackedContext.Provider value={{ stacked, setStacked }}>
      {children}
    </StackedContext.Provider>
  );

};

export { StackedContextProvider, StackedContext };