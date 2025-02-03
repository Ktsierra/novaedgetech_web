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
          <button
            className="back-button"
            onClick={() => {setStarSelected(false);}}
          >
            {about.header.backButtonText}
          </button>
        </div>
        <section className="main-skills row">
          {about.header.mainSkills.map((skill, index) => (
            <div key={index}>{skill}</div>
          ))}
        </section>
      </div>

      <div className="about-content">
        <div className="mission-vision">
          <section>
            <h3>{about.sections.mission.heading}</h3>
            <div className="section-text">
              {about.sections.mission.content}
            </div>
          </section>

          <section>
            <h3>{about.sections.vision.heading}</h3>
            <div className="section-text">
              {about.sections.vision.content}
            </div>
          </section>
        </div>

        <section className="technical-expertise">
          <h3>{about.sections.technicalExpertise.heading}</h3>
          <div className="specs-flex">
            {about.sections.technicalExpertise.categories.map((category, index) => (
              <div key={index} className="spec-item">
                <h4>{category.name}</h4>
                <ul className="tech-list">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="recent-achievements">
          <h3>{about.sections.recentAchievements.heading}</h3>
          <div className="timeline">
            {about.sections.recentAchievements.timeline.map((entry, index) => (
              <div key={index} className="log-entry">
                <span className="timestamp">{entry.timestamp}</span>
                <div className="log-content">{entry.content}</div>
              </div>
            ))}
          </div>
        </section>
      </div>


      <div className="footer-interface">
        <div className="footer-line">{about.footer.footerLine}</div>
        <div className="pulse-indicator"></div>
      </div>
    </BottomSheet>
  );
};


export default AboutMobile;