import { Comp } from "kaplay";

export interface HealthComp extends Comp {
  oxygen: number;
  heal: (byAmount: number) => void;
  hurt: (byAmount: number) => void;
}

const MAX_OXYGEN = 100;

export default function health(): HealthComp {
  let oxygen: number = MAX_OXYGEN;

  const clamp = (v: number) => Math.max(0, Math.min(MAX_OXYGEN, v));

  return {
    get oxygen() {
      return oxygen;
    },
    set oxygen(value: number) {
      oxygen = clamp(value);
    },

    heal(byAmount) {
      oxygen = clamp(oxygen + byAmount);
    },

    hurt(byAmount) {
      oxygen = clamp(oxygen - byAmount);
    }
  }
}