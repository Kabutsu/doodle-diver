import { Comp } from "kaplay";

export const DEFAULT_BOUNDS: [number, number] = [8000, 10000];

export interface VelocityComp extends Comp {
  speedY: number;
  speedMultiplier: number;
}

export default function velocity(bounds: [number, number] = DEFAULT_BOUNDS): VelocityComp {
  const [min, max] = bounds.sort();
  let speedY = min + (Math.random() * (max - min));
  let speedMultiplier = 1;

  return {
    get speedY() {
      return -speedY * speedMultiplier;
    },
    set speedY(value: number) {
      speedY = value;
    },
    get speedMultiplier() {
      return speedMultiplier;
    },
    set speedMultiplier(value: number) {
      speedMultiplier = value;
    },
  };
}