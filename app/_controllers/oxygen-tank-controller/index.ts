import { GameObj, KAPLAYCtx, PosComp } from "kaplay";
import { PLAYER_TAG } from "../player-controller";
import { HealthComp } from "@/app/_components/logic/health";
import { VelocityComp } from "@/app/_components/logic/velocity";
import { SIDE_WALL_TAG } from "../hazard-controller";
import * as tags from "@/app/_helpers/tags";

export const OXYGEN_TANK_TAG = tags.OXYGEN_TANK_TAG;

const DESTROY = 'oxygenTank_DESTROY';
const BASE_FALL_SPEED = 1500;
const HEAL_AMOUNT = 10;

type Args = {
  k: KAPLAYCtx;
  getFallSpeed: () => number;
};

export default function oxygenTankController({ k, getFallSpeed }: Args) {
  const {
    onCollide,
    onUpdate,
    getCamPos,
    height,
    destroyAll,
  } = k;

  let isCleanedUp = false;
  let updateEvent: { cancel: () => void } | null = null;

  // Collision handlers
  onCollide(OXYGEN_TANK_TAG, PLAYER_TAG, (b, p) => {
    b.destroy();
    (p as GameObj<HealthComp>).heal(HEAL_AMOUNT);
    k.play('oxygen-pop', { volume: 0.8 });
  });

  onCollide(OXYGEN_TANK_TAG, SIDE_WALL_TAG, (b) => {
    b.destroy();
  });

  // Update loop - move oxygen tanks
  updateEvent = onUpdate(() => {
    if (isCleanedUp) {
      return;
    }

    const dt = k.dt();
    const fallSpeed = getFallSpeed();
    const speedMultiplier = fallSpeed / BASE_FALL_SPEED;
    const camTop = getCamPos().y - (height() / 2);

    k.get(OXYGEN_TANK_TAG).forEach(
      (oxygenTank) => {
        const b = oxygenTank as GameObj<PosComp | VelocityComp>;
        if (b.pos.y < camTop) {
          b.tag(DESTROY);
          return;
        }

        b.speedMultiplier = speedMultiplier;
        b.move(0, b.speedY * dt);
      }
    );

    destroyAll(DESTROY);
  })

  const cleanup = () => {
    isCleanedUp = true;
    if (updateEvent) {
      updateEvent.cancel();
      updateEvent = null;
    }
  };

  return { cleanup };
}

export type OxygenTankControllerReturn = ReturnType<typeof oxygenTankController>;