import useCamera from "../../hooks/useCamera";
import SidePanel from "../SidePanel";
import { about } from './aboutText';
import './About.desktop.css';

const AboutDesktop = () => {
  const { setStarSelected } = useCamera();

  return (
    <div className="desktop-about-panels">
      <SidePanel
        styles={{
          left: '0',
          top: '10%',
          width: '35%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        transitionFrom={{ x: '-100vw', y: '0' }}>
        <div className='top-bar'>
          <h2 className="title">{about.header.title}</h2>
          <button
            onClick={() => {setStarSelected(false);}}
            className="back-button"
          >
            {about.header.backButtonText}
          </button>
        </div>
        <section className="main-skills column">
          {
            about.header.mainSkills.map((skill, index) => (
              <div key={index}>{skill}</div>
            ))
          }
        </section>
        <section>
          <h3>{about.sections.mission.heading}</h3>
          <div className="section-text section-width">
            {about.sections.mission.content}
          </div>
        </section>
        <section>
          <h3>{about.sections.vision.heading}</h3>
          <div className="section-text section-width">
            {about.sections.vision.content}
          </div>
        </section>
      </SidePanel>

      <SidePanel
        styles={{
          right: '0',
          top: '5%',
          width: '45%',
          maxHeight: '45vh',
          overflow: 'auto',
        }}
        transitionFrom={{ x: '100vw', y: '0' }}>
        <h3>{about.sections.technicalExpertise.heading}</h3>
        <div className="specs-flex specs-width">
          {
            about.sections.technicalExpertise.categories.map((category, index) => (
              <div className="spec-item" key={index}>
                <h4>{category.name}</h4>
                <ul className="tech-list">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))
          }
        </div>
      </SidePanel>

      <SidePanel
        styles={{
          right: '0',
          bottom: '5%',
          width: '45%',
          maxHeight: '30vh',
          overflow: 'auto',
        }}
        transitionFrom={{ x: '0', y: '100vh' }}>
        <section>
          <h3>{about.sections.recentAchievements.heading}</h3>
          <div className="timeline">
            {
              about.sections.recentAchievements.timeline.map((item, index) => (
                <div className="log-entry" key={index}>
                  <span className="timestamp">{item.timestamp}</span>
                  <div className="log-content">{item.content}</div>
                </div>
              ))
            }
          </div>
        </section>
        <div className="footer-interface">
          <div className="command-line">{about.footer.footerLine}</div>
          <div className="pulse-indicator"></div>
        </div>
      </SidePanel>
    </div>
  );
};


export default AboutDesktop;