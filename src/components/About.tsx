import { AnimatePresence } from 'framer-motion';
import './About.css';
import SidePanel from './SidePanel';

const About = () => {
  return (
    <AnimatePresence>
      <SidePanel direction="left">
        <h2>** MISSION BRIEFING</h2>
        <div className="terminal-text">
              &gt; INITIALIZING SYSTEM SCAN...
          <br />
              &gt; LOADING TACTICAL DATA...
          <br />
              &gt; PREPARING DEPLOYMENT...
        </div>
      </SidePanel>

      <SidePanel direction="right">
        <h2>** OPERATION OVERVIEW</h2>
        <div className="stats-grid">
          <div>STATUS:</div>
          <div>ACTIVE</div>
          <div>OBJECTIVE:</div>
          <div>ESTABLISH DOMINANCE</div>
          <div>FORCES:</div>
          <div>READY</div>
        </div>
      </SidePanel>

      <SidePanel direction="bottom">
        <h2>** COMMAND INTERFACE</h2>
        <div className="command-interface">
              [1] DEPLOY UNITS
          <br />
              [2] RESEARCH TECH
          <br />
              [3] BUILD STRUCTURES
        </div>
      </SidePanel>

    </AnimatePresence>
  );
};

export default About;