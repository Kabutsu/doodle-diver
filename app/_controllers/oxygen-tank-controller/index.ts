import { GameObj, KAPLAYCtx, PosComp } from "kaplay";
import { PLAYER_TAG } from "../player-controller";
import { HealthComp } from "@/app/_components/logic/health";
import { VelocityComp } from "@/app/_components/logic/velocity";
import { SIDE_WALL_TAG } from "../hazard-controller";
import * as tags from "@/app/_helpers/tags";

export const OXYGEN_TANK_TAG = tags.OXYGEN_TANK_TAG;

const DESTROY = 'oxygenTank_DESTROY';

type Args = {
  k: KAPLAYCtx;
};

export default function oxygenTankController({ k }: Args) {
  const {
    onCollide,
    onUpdate,
    getCamPos,
    height,
    destroyAll,
  } = k;

  let isCleanedUp = false;

  // Collision handlers
  onCollide(OXYGEN_TANK_TAG, PLAYER_TAG, (b, p) => {
    b.destroy();
    (p as GameObj<HealthComp>).heal(15);
  });

  onCollide(OXYGEN_TANK_TAG, SIDE_WALL_TAG, (b) => {
    b.destroy();
  });

  // Update loop - move oxygen tanks
  onUpdate(() => {
    if (isCleanedUp) {
      return;
    }

    const dt = k.dt();
    const camTop = getCamPos().y - (height() / 2);

    k.get(OXYGEN_TANK_TAG).forEach(
      (oxygenTank) => {
        const b = oxygenTank as GameObj<PosComp | VelocityComp>;
        if (b.pos.y < camTop) {
          b.tag(DESTROY);
          return;
        }

        b.move(0, b.speedY * dt);
      }
    );

    destroyAll(DESTROY);
  })

  const cleanup = () => {
    isCleanedUp = true;
  };

  return { cleanup };
}

export type OxygenTankControllerReturn = ReturnType<typeof oxygenTankController>;