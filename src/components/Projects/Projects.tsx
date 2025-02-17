import { AnimatePresence } from "framer-motion";
import useStacked from "../../hooks/useStacked";
import ProjectsDesktop from "./Projects.desktop";
import ProjectsMobile from "./Projects.mobile";
import "./Projects.css";

const Projects = () => {
  const { stacked } = useStacked();

  return (
    <AnimatePresence mode="wait">
      {stacked ? (
        <ProjectsMobile key="mobile" />
      ) : (
        <ProjectsDesktop key="desktop" />
      )}
    </AnimatePresence>
  );
};

export default Projects;
