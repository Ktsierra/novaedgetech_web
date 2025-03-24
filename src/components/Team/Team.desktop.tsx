import useCamera from "../../hooks/useCamera";
import SidePanel from "../SidePanel";
import { team } from "./teamText";
import "./Team.desktop.css";
import Github from "../logos/GitHubLogo";
import LinkedIn from "../logos/Linkedin";

const TeamDesktop = () => {
  const { setStarSelected } = useCamera();

  return (
    <div className="desktop-team-panels">
      {/* Left Panel: Header, Skills & Profile */}
      <SidePanel
        styles={{
          left: "0",
          top: "10%",
          width: "45%",
          maxHeight: "80vh",
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
        <section className="profile-desktop">
          <div className="profile-header">
            <h3>{team.sections.profile.heading}</h3>
            <div>
              <Github
                className="logo-icon"
                onClick={() => {
                  window.open("https://github.com/Ktsierra", "_blank");
                }}
              />
              <LinkedIn
                className="logo-icon"
                onClick={() => {
                  window.open("https://www.linkedin.com/in/jose-javier-sierra-delgado-5a8249246/", "_blank");
                }}
              />
            </div>
          </div>
          <div className="section-text">
            {team.sections.profile.image && (
              <img
                src={team.sections.profile.image}
                alt="Profile"
                className="profile-image profile-image-desktop"
              />
            )}
            {team.sections.profile.content}
          </div>
        </section>
      </SidePanel>

      {/* Right Panel: Details */}
      <SidePanel
        styles={{
          right: "0",
          bottom: "10%",
          width: "45%",
          maxHeight: "80vh",
          overflow: "auto"
        }}
        transitionFrom={{ x: "100vw", y: "0" }}
      >
        <section>
          <h3>{team.sections.details.heading}</h3>
          <div className="section-text section-width">
            {team.sections.details.content}
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
