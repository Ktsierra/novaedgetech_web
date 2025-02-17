import { AnimatePresence } from "framer-motion";
import useStacked from "../../hooks/useStacked";
import ContactDesktop from "./Contact.desktop";
import ContactMobile from "./Contact.mobile";
import "./Contact.css";

const Projects = () => {
  const { stacked } = useStacked();

  return (
    <AnimatePresence mode="wait">
      {stacked ? (
        <ContactMobile key="mobile" />
      ) : (
        <ContactDesktop key="desktop" />
      )}
    </AnimatePresence>
  );
};

export default Projects;
