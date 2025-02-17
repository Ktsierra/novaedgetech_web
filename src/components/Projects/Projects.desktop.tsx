import useCamera from "../../hooks/useCamera";
import SidePanel from "../SidePanel";
import { projects } from "./projectsText";
import "./Projects.desktop.css";

const ProjectsDesktop = () => {
  const { setStarSelected } = useCamera();

  return (
    <div className="desktop-projects-panels">
      {/* Left Panel: Header & Featured Projects */}
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
          <h2 className="title">{projects.header.title}</h2>
          <button
            onClick={() => { setStarSelected(false); }}
            className="back-button"
          >
            {projects.header.backButtonText}
          </button>
        </div>
        <section className="main-skills column">
          {projects.header.mainSkills.map((skill, index) => (
            <div key={index}>{skill}</div>
          ))}
        </section>
        <section>
          <h3>{projects.sections.featuredProjects.heading}</h3>
          <div className="section-text section-width">
            {projects.sections.featuredProjects.content}
            <div className="project-list">
              {projects.sections.featuredProjects.projects.map(
                (project, index) => (
                  <div key={index} className="project-item">
                    <h3>{project.title}</h3>
                    <img
                      src={project.image}
                      className="project-image"
                    />
                    <p>{project.description}</p>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </SidePanel>

      {/* Right Panel: Upcoming Work */}
      <SidePanel
        styles={{
          right: "0",
          bottom: "20%",
          width: "45%",
          maxHeight: "80vh",
          overflow: "auto"
        }}
        transitionFrom={{ x: "100vw", y: "0" }}
      >
        <section>
          <h3>{projects.sections.upcomingProjects.heading}</h3>
          <div className="section-text section-width">
            {projects.sections.upcomingProjects.content}
          </div>
        </section>
        <div className="footer-interface">
          <div className="command-line">{projects.footer.footerLine}</div>
          <div className="pulse-indicator"></div>
        </div>
      </SidePanel>
    </div>
  );
};

export default ProjectsDesktop;
