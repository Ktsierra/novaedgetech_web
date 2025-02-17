import useCamera from "../../hooks/useCamera";
import BottomSheet from "../BottomSheet";
import { projects } from "./projectsText";
import "./Projects.mobile.css";

const ProjectsMobile = () => {
  const { setStarSelected } = useCamera();

  return (
    <BottomSheet>
      <div className="projects-header-mobile">
        <div className="top-bar">
          <h2 className="title">{projects.header.title}</h2>
          <button
            className="back-button"
            onClick={() => { setStarSelected(false); }}
          >
            {projects.header.backButtonText}
          </button>
        </div>
        <section className="main-skills row">
          {projects.header.mainSkills.map((skill, index) => (
            <div key={index}>{skill}</div>
          ))}
        </section>
      </div>

      <div className="projects-content">
        {/* Featured Projects */}
        <section>
          <h3>{projects.sections.featuredProjects.heading}</h3>
          <p>{projects.sections.featuredProjects.content}</p>
          <div className="project-list">
            {projects.sections.featuredProjects.projects.map(
              (project, index) => (
                <div key={index} className="project-item">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="project-image"
                  />
                  <h4>{project.title}</h4>
                  <p>{project.description}</p>
                </div>
              )
            )}
          </div>
        </section>

        {/* Upcoming Work */}
        <section>
          <h3>{projects.sections.upcomingProjects.heading}</h3>
          <p>{projects.sections.upcomingProjects.content}</p>
        </section>
      </div>

      {/* Footer */}
      <div className="footer-interface">
        <p>{projects.footer.footerLine}</p>
        <div className="pulse-indicator"></div>
      </div>
    </BottomSheet>
  );
};

export default ProjectsMobile;
