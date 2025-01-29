import useCamera from "../hooks/useCamera";
import { initialReferencePoints } from "../constants/referencePoints";
import About from "./About";
import Contact from "./Contact";
import Projects from "./Projects";
import Team from "./Team";
const PresentationCard = () => {
  const { starSelected, starIndex, setStarSelected } = useCamera();

  if (!starSelected) return null;
  if (starIndex > initialReferencePoints.length) return null;

  const { title } = initialReferencePoints[starIndex];

  return (
    <div style={{
      position : 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
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