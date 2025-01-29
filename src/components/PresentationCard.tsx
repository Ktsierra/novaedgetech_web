import useCamera from "../hooks/useCamera";
import { initialReferencePoints } from "../constants/referencePoints";
import About from "./About";
import Contact from "./Contact";
import Projects from "./Projects";
import Team from "./Team";
import './PresentationCard.css';

const PresentationCard = () => {
  const { starSelected, starIndex, setStarSelected } = useCamera();

  if (!starSelected) return null;
  if (starIndex > initialReferencePoints.length) return null;

  const { title } = initialReferencePoints[starIndex];

  return (
    <div
      className="presentation-card"
      onClick={() => {setStarSelected(false);}}
    >
      {title === 'About' && <About />}
      {title === 'Team' && <Team />}
      {title === 'Projects' && <Projects />}
      {title === 'Contact' && <Contact />}
    </div>

  );
};

export default PresentationCard;