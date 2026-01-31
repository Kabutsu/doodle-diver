import { Comp } from "kaplay";

export const DEFAULT_BOUNDS: [number, number] = [8000, 10000];

export interface VelocityComp extends Comp {
  speedY: number;
}

export default function velocity(bounds: [number, number] = DEFAULT_BOUNDS): VelocityComp {
  const [min, max] = bounds.sort();
  let speedY = min + (Math.random() * (max - min));

  return {
    get speedY() {
      return -speedY;
    },
    set speedY(value: number) {
      speedY = value;
    },
  };
}