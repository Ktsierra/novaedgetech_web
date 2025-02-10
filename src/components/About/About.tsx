import { AnimatePresence } from 'framer-motion';
import useStacked from '../../hooks/useStacked';
import AboutDesktop from './About.desktop';
import AboutMobile from './About.mobile';
import './About.css';

const About = () => {
  const { stacked } = useStacked();

  return (
    <AnimatePresence mode="wait">
      {stacked ? (
        <AboutMobile key="mobile" />
      ) : (
        <AboutDesktop key="desktop" />
      )}
    </AnimatePresence>
  );
};

export default About;
