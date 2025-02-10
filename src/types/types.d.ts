export interface ReferencePoint {
  position: THREE.Vector3;
  title: 'About' | 'Team' | 'Projects' | 'Contact';
}

export interface HazeProps {
  direction: number;
  color: number;
  cluster: 'center' | 'periphery' | 'arms';
}

export interface StarNoReference {
  position: THREE.Vector3;
  starType: number;
}
export interface Star extends StarNoReference {
  isReference: boolean;
}

export interface SidePanelProps {
  transitionFrom: {
    x?: string;
    y?: string;
  };
  styles: React.CSSProperties;
  children: React.ReactNode;
}

export interface About {
  header: {
    title: string;
    backButtonText: string;
    mainSkills: string[];
  };
  sections: {
    mission: {
      heading: string;
      content: string;
    };
    vision: {
      heading: string;
      content: string;
    };
    technicalExpertise: {
      heading: string;
      categories: {
        name: string;
        items: string[];
      }[];
    };
    recentAchievements: {
      heading: string;
      timeline: {
        timestamp: string;
        content: string;
      }[];
    };
  };
  footer: {
    footerLine: string;
  };
}

export interface Team {
  header: {
    title: string
    backButtonText: string;
    mainSkills: string[];
  };
  sections: {
    leadership: {
      heading: string;
      content: string;
    };
    teamMembers: {
      heading: string;
      content: string;
    };
    coreValues: {
      heading: string;
      content: string;
    };
  };
  footer: {
    footerLine: string;
  };
}
