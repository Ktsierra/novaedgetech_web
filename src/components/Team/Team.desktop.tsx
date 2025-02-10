// TeamDesktop.tsx
import useCamera from "../../hooks/useCamera";
import SidePanel from "../SidePanel";
import { team } from "./teamText";
import "./Team.desktop.css";

const TeamDesktop = () => {
  const { setStarSelected } = useCamera();

  return (
    <div className="desktop-team-panels">
      {/* Left Panel: Header & Leadership */}
      <SidePanel
        styles={{
          left: "0",
          top: "10%",
          width: "30%",
          maxHeight: "70vh",
          overflow: "auto"
        }}
        transitionFrom={{ x: "-100vw", y: "0" }}
      >
        <div className="top-bar">
          <h2 className="title">{team.header.title}</h2>
          <button onClick={() => { setStarSelected(false); }} className="back-button">
            {team.header.backButtonText}
          </button>
        </div>
        <section className="main-skills column">
          {team.header.mainSkills.map((skill, index) => (
            <div key={index}>{skill}</div>
          ))}
        </section>
        <section>
          <h3>{team.sections.leadership.heading}</h3>
          <div className="section-text section-width">
            {team.sections.leadership.content}
          </div>
        </section>
      </SidePanel>

      {/* Right Panel: Team Members */}
      <SidePanel
        styles={{
          right: "0",
          top: "10%",
          width: "30%",
          maxHeight: "70vh",
          overflow: "auto"
        }}
        transitionFrom={{ x: "100vw", y: "0" }}
      >
        <section>
          <h3>{team.sections.teamMembers.heading}</h3>
          <div className="section-text section-width">
            {team.sections.teamMembers.content}
          </div>
        </section>
      </SidePanel>

      {/* Bottom Panel: Core Values & Footer */}
      <SidePanel
        styles={{
          right: "0",
          bottom: "5%",
          width: "30%",
          maxHeight: "30vh",
          overflow: "auto"
        }}
        transitionFrom={{ x: "0", y: "100vh" }}
      >
        <section>
          <h3>{team.sections.coreValues.heading}</h3>
          <div className="section-text section-width">
            {team.sections.coreValues.content}
          </div>
        </section>
        <div className="footer-interface">
          <div className="command-line">{team.footer.footerLine}</div>
          <div className="pulse-indicator"></div>
        </div>
      </SidePanel>
    </div>
  );
};

export default TeamDesktop;
