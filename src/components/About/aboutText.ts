import { About } from "../../types/types";

export const about: About = {
  header: {
    title: "About NovaEdge Tech",
    backButtonText: "X",
    mainSkills: [
      "Software Development",
      "IT Consultant",
      "Cloud Migration"
    ]
  },
  sections: {
    mission: {
      heading: "Mission",
      content:
        "To provide innovative IT and software solutions that empower businesses through cutting-edge technology, ensuring seamless operations and enhanced connectivity."
    },
    vision: {
      heading: "Vision",
      content:
        "To revolutionize business technology infrastructure by creating intelligent, secure, and scalable solutions that elevate operational efficiency and drive industry advancement."
    },
    technicalExpertise: {
      heading: "Technical Expertise",
      categories: [
        {
          name: "Cloud & Infrastructure",
          items: [
            "AWS Cloud Services",
            "Docker & Kubernetes",
            "Network Architecture"
          ]
        },
        {
          name: "Development",
          items: [
            "TypeScript & React",
            "Cross-platform Apps",
            "API Integration"
          ]
        },
        {
          name: "Security",
          items: [
            "VPN Solutions",
            "Disaster Recovery",
            "Cloud Security"
          ]
        },
        {
          name: "Communications",
          items: [
            "VoIP Systems",
            "3CX Implementation",
            "Network Management"
          ]
        }
      ]
    },
    recentAchievements: {
      heading: "Recent Achievements",
      timeline: [
        {
          timestamp: "2025.01",
          content: "Startup founded"
        }
      ]
    }
  },
  footer: {
    footerLine: "Ready to elevate your business technology?"
  }
};
