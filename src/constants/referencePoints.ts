import { ARM_X_MEAN, ARM_Y_MEAN, } from "./galaxy";
import * as THREE from "three";
import { ReferencePoint } from "../types/types";

export const initialReferencePoints: ReferencePoint[] = [
  {
    position: new THREE.Vector3(ARM_X_MEAN + 5, ARM_Y_MEAN - 3, 0.5),
    title: "About",
  },
  {
    position: new THREE.Vector3(-ARM_X_MEAN + 8, ARM_Y_MEAN + 2, -0.3),
    title: "Team",
  },
  {
    position: new THREE.Vector3(ARM_X_MEAN - 4, -ARM_Y_MEAN + 6, 0.8),
    title: "Projects",
  },
  {
    position: new THREE.Vector3(-ARM_X_MEAN - 3, -ARM_Y_MEAN - 5, -0.5),
    title: "Contact",
  }
];
