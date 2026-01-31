import { Comp } from "kaplay";

export interface HealthComp extends Comp {
  oxygen: number;
  heal: (byAmount: number) => void;
  hurt: (byAmount: number) => void;
}

export default function health(): HealthComp {
  let oxygen: number = 100;

  return {
    get oxygen() {
      return oxygen;
    },
    set oxygen(value: number) {
      oxygen = value;
    },

    heal(byAmount) {
      oxygen += byAmount;
    },

    hurt(byAmount) {
      oxygen -= byAmount;
    }
  }
}