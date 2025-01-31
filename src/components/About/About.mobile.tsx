import BottomSheet from '../BottomSheet';
import './About.mobile.css';

const AboutMobile = () => {
  return (
    <BottomSheet>
      <div className="about-header">
        <h2 className="cosmic-title">About NovaEdge Tech</h2>
        <section>
          <div className="cosmic-stats">
            <div>Software Development</div>
            <div>IT Security</div>
            <div>COORDINATES: EARTH-616</div>
          </div>
        </section>
      </div>

      <div className="about-content">
        <section>
          <h3>** MISSION DIRECTIVE</h3>
          <div className="terminal-text">
              &gt; Exploring the digital frontier
            <br />
              &gt; Creating innovative solutions
            <br />
              &gt; Pushing technological boundaries
          </div>
        </section>

        <section>
          <h3>** TECHNICAL SPECIFICATIONS</h3>
          <div className="specs-grid">
            <div className="spec-item">
              <h4>Frontend Systems</h4>
              <ul className="tech-list">
                <li>React Navigation</li>
                <li>Three.js Rendering</li>
                <li>Motion Controls</li>
              </ul>
            </div>
            <div className="spec-item">
              <h4>Backend Systems</h4>
              <ul className="tech-list">
                <li>Data Processing</li>
                <li>API Integration</li>
                <li>Cloud Computing</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h3>** MISSION LOGS</h3>
          <div className="timeline">
            <div className="log-entry">
              <span className="timestamp">2023.12</span>
              <div className="log-content">Launched Galaxy Portfolio</div>
            </div>
            {/* Add more log entries */}
          </div>
        </section>
      </div>

      <div className="about-footer">
        <div className="command-interface">
          <div className="command-line">&gt; System ready for engagement</div>
          <div className="pulse-indicator"></div>
        </div>
      </div>
    </BottomSheet>
  );
};


export default AboutMobile;