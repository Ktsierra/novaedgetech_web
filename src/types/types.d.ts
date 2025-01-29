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
