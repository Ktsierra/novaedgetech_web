import useStacked from '../hooks/useStacked';
import './About.css';
import SidePanel from './SidePanel';

const About = () => {
  const { stacked } = useStacked();

  return (
    <>
      <div key={'left'} className={stacked ? 'stacked' : 'left-panels'}>
        <SidePanel styles={{ top: '25%', left: '0%' }} transitionFrom={{ x: '-100vw', y: '0' }}>
          <h2>** MISSION BRIEFING</h2>
          <div className="terminal-text">
                  &gt; INITIALIZING SYSTEM SCAN...
            <br />
                  &gt; LOADING TACTICAL DATA...
            <br />
                  &gt; PREPARING DEPLOYMENT...
          </div>
        </SidePanel>
      </div>
      <div key={'right'} className={ stacked ? 'stacked' : 'right-panels'}>
        <SidePanel styles={{ top: '5%', right: '0%' }} transitionFrom={{ x: '100vw', y: '0' }}>
          <h2>** OPERATION OVERVIEW</h2>
          <div className="stats-grid">
            <div>STATUS:</div>
            <div>ACTIVE</div>
            <div>OBJECTIVE:</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>ESTABLISH DOMINANCE</div>
            <div>FORCES:</div>
            <div>READY</div>
          </div>
        </SidePanel>
        <SidePanel styles= {{ bottom: '2.5%', right: '0%' }} transitionFrom={{ x: '0', y: '100vh' }}>
          <h2>** COMMAND INTERFACE</h2>
          <div className="command-interface">
                  [1] DEPLOY UNITS
            <br />
                  [2] RESEARCH TECH
            <br />
                  [3] BUILD STRUCTURES
          </div>
        </SidePanel>
      </div>
    </>
  );
};

export default About;