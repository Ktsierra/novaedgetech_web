import useCamera from '../../hooks/useCamera';
import BottomSheet from '../BottomSheet';
import about from './about.json';
import './About.mobile.css';

const AboutMobile = () => {
  const { setStarSelected } = useCamera();

  return (
    <BottomSheet>
      <div className="about-header-mobile">
        <div className='top-bar'>
          <h2 className="title">{about.header.title}</h2>
          <button onClick={() => {setStarSelected(false);}} className="back-button">X</button>
        </div>
        <section className="main-skills row">
          <div>Software Development</div>
          <div>IT Consultant</div>
          <div>Cloud Migration</div>
        </section>
      </div>

      <div className="about-content">
        <section>
          <h3>Mission</h3>
          <div className="section-text">
            To provide innovative IT and software solutions
            that empower businesses through cutting-edge technology,
            ensuring seamless operations and enhanced connectivity.
          </div>
        </section>

        <section>
          <h3>Vision</h3>
          <div className="section-text">
            To revolutionize business technology infrastructure by creating
            intelligent, secure, and scalable solutions that elevate operational
            efficiency and drive industry advancement.
          </div>
        </section>

        <section>
          <h3>Technical Expertise</h3>
          <div className="specs-flex">
            <div className="spec-item">
              <h4>Cloud & Infrastructure</h4>
              <ul className="tech-list">
                <li>AWS Cloud Services</li>
                <li>Docker & Kubernetes</li>
                <li>Network Architecture</li>
              </ul>
            </div>
            <div className="spec-item">
              <h4>Development</h4>
              <ul className="tech-list">
                <li>TypeScript & React</li>
                <li>Cross-platform Apps</li>
                <li>API Integration</li>
              </ul>
            </div>
            <div className="spec-item">
              <h4>Security</h4>
              <ul className="tech-list">
                <li>VPN Solutions</li>
                <li>Disaster Recovery</li>
                <li>Cloud Security</li>
              </ul>
            </div>
            <div className="spec-item">
              <h4>Communications</h4>
              <ul className="tech-list">
                <li>VoIP Systems</li>
                <li>3CX Implementation</li>
                <li>Network Management</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h3>Recent Achievements</h3>
          <div className="timeline">
            <div className="log-entry">
              <span className="timestamp">2025.01</span>
              <div className="log-content"> Startup founded</div>
            </div>
            {/* Add more log entries */}
          </div>
        </section>
      </div>

      <div className="footer-interface">
        <div className="command-line">Ready to elevate your business technology?</div>
        <div className="pulse-indicator"></div>
      </div>
    </BottomSheet>
  );
};


export default AboutMobile;