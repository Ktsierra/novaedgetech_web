// Team.tsx
import { AnimatePresence } from "framer-motion";
import useStacked from "../../hooks/useStacked";
import TeamDesktop from "./Team.desktop";
import TeamMobile from "./Team.mobile";
import "./Team.css";

const Team = () => {
  const { stacked } = useStacked();

  return (
    <AnimatePresence mode="wait">
      {stacked ? (
        <TeamMobile key="mobile" />
      ) : (
        <TeamDesktop key="desktop" />
      )}
    </AnimatePresence>
  );
};

export default Team;
