import { useContext } from "react";
import { StackedContext } from "../context/StackedContext";

const useStacked = () => {
  const context = useContext(StackedContext);
  if (context === undefined) {
    throw new Error('useStacked must be used within a StackedProvider');
  }
  return context;
};

export default useStacked;
