// TeamMobile.tsx
import useCamera from "../../hooks/useCamera";
import BottomSheet from "../BottomSheet";
import { team } from "./teamText";
import "./Team.mobile.css";

const TeamMobile = () => {
  const { setStarSelected } = useCamera();

  return (
    <BottomSheet>
      <div className="team-header-mobile">
        <div className="top-bar">
          <h2 className="title">{team.header.title}</h2>
          <button
            className="back-button"
            onClick={() => { setStarSelected(false); }}
          >
            {team.header.backButtonText}
          </button>
        </div>
        <section className="main-skills row">
          {team.header.mainSkills.map((skill, index) => (
            <div key={index}>{skill}</div>
          ))}
        </section>
      </div>

      <div className="team-content">
        <section>
          <h3>{team.sections.leadership.heading}</h3>
          <div className="section-text">
            {team.sections.leadership.content}
          </div>
        </section>

        <section>
          <h3>{team.sections.teamMembers.heading}</h3>
          <div className="section-text">
            {team.sections.teamMembers.content}
          </div>
        </section>

        <section>
          <h3>{team.sections.coreValues.heading}</h3>
          <div className="section-text">
            {team.sections.coreValues.content}
          </div>
        </section>
      </div>

      <div className="footer-interface">
        <div className="footer-line">{team.footer.footerLine}</div>
        <div className="pulse-indicator"></div>
      </div>
    </BottomSheet>
  );
};

export default TeamMobile;
