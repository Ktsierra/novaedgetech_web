export interface ReferencePoint {
  position: THREE.Vector3;
  title: string;
}

export interface HazeProps {
  direction: number;
  color: number;
  cluster: 'center' | 'periphery' | 'arms';
}