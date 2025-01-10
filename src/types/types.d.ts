import { Vector3 } from 'three';

export interface StarType {
  color: number;
  size: number;
  percentage: number;
}

export interface StarProps {
  position: Vector3;
  starType: number;
  scale?: number;
}

export interface HazeProps {
  position: Vector3;
  scale?: number;
  opacity?: number;
}

export interface GalaxyProps {
  numStars?: number;
  arms?: number;
  thickness?: number;
}
