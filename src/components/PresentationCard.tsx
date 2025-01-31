import useCamera from "../hooks/useCamera";
import { initialReferencePoints } from "../constants/referencePoints";
import About from "./About/About";
import Contact from "./Contact";
import Projects from "./Projects";
import Team from "./Team";
import './PresentationCard.css';
import { StackedContextProvider } from "../context/StackedContext";
import { AnimatePresence, motion } from "framer-motion";

const PresentationCard = () => {
  const { starSelected, starIndex, setStarSelected } = useCamera();

  if (starIndex > initialReferencePoints.length) return null;

  const { title } = initialReferencePoints[starIndex];

  return (
    <AnimatePresence mode="wait">
      {starSelected && (
        <StackedContextProvider>
          <motion.div
            key="presentation-card"
            className="presentation-card"
            onClick={() => {setStarSelected(false);}}
            initial={{ opacity: 0, scale:1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {title === 'About' && <About />}
            {title === 'Team' && <Team />}
            {title === 'Projects' && <Projects />}
            {title === 'Contact' && <Contact />}
          </motion.div>
        </StackedContextProvider>
      )}
    </AnimatePresence>
  );
};

export default PresentationCard;
