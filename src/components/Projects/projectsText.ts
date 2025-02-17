import { Projects } from "../../types/types";

export const projects: Projects = {
  header: {
    title: "Our Projects",
    backButtonText: "X",
    mainSkills: [
      "SkyVault ",
      "Verde",
    ]
  },
  sections: {
    featuredProjects: {
      heading: "Featured Projects",
      content:
      "Take a look at our projects, which have helped businesses and individuals achieve their goals.",
      projects: [
        {
          title: "SkyVault",
          description:
              "A software solution to help a aviation repair stations streamline inventory tracking and improve operational efficiency.",
          image:
              "https://via.placeholder.com/300"
        },
        {
          title: "Verde",
          description:
          "A mobile and web app designed to help home gardeners track plants and manage tasks efficiently. Currently in development.",
          image:
                "https://via.placeholder.com/300"
        }
      ]
    },
    upcomingProjects: {
      heading: "What’s Next?",
      content:
          "I’m always looking for new opportunities to help businesses grow through technology. Whether you need custom software, cloud solutions, or system integrations, I’m here to collaborate with you and bring your ideas to life."
    }
  },
  footer: {
    footerLine: "Let’s discuss how I can help your business succeed."
  }
};
