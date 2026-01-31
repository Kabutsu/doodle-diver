import { GameObj, KAPLAYCtx, PosComp, RectComp } from "kaplay";
import { PLAYER_TAG } from "../player-controller";
import { HealthComp } from "@/app/_components/logic/health";
import velocity, { VelocityComp } from "@/app/_components/logic/velocity";
import { SIDE_WALL_TAG } from "../hazard-controller";

export const BUBBLE_TAG = 'bubble';

const DESTROY = 'bubble_DESTROY';
const COLOR = '#a6dbff';

const MIN_TIMEOUT = 1500;
const MAX_TIMEOUT = 5000;

const MIN_SPEED_Y = 4500;
const MAX_SPEED_Y = 15000;

type Args = {
  k: KAPLAYCtx;
  player: GameObj<PosComp | RectComp>;
};

export default function bubblesController({ k, player }: Args) {
  const {
    add,
    circle,
    pos,
    color,
    area,
    width,
    height,
    onCollide,
    onUpdate,
    getCamPos,
    destroyAll,
  } = k;

  let timeout: ReturnType<typeof setTimeout>;

  function spawnBubbleWithTimeout() {
    const x = Math.random() * width();
    const y = player.pos.y + height();
    
    add([
      circle(16),
      pos(x, y),
      color(COLOR),
      area({ collisionIgnore: undefined }),
      velocity([MIN_SPEED_Y, MAX_SPEED_Y]),
      BUBBLE_TAG,
    ]);
    
    timeout = setTimeout(
      spawnBubbleWithTimeout,
      MIN_TIMEOUT + (Math.random() * (MAX_TIMEOUT - MIN_TIMEOUT))
    );
  }

  timeout = setTimeout(
    spawnBubbleWithTimeout,
    MIN_TIMEOUT + (Math.random() * (MAX_TIMEOUT - MIN_TIMEOUT))
  );

  let bubblesCleared = false;

  const cleanupBubbles = () => {
    bubblesCleared = true;
    destroyAll(BUBBLE_TAG);
    clearTimeout(timeout);
  };

  onCollide(BUBBLE_TAG, PLAYER_TAG, (b, p) => {
    b.destroy();
    (p as GameObj<HealthComp>).heal(15);
  });

  onCollide(BUBBLE_TAG, SIDE_WALL_TAG, (b) => {
    b.destroy();
  });

  onUpdate(() => {
    if (bubblesCleared) {
      return;
    }

    const dt = k.dt();
    const camTop = getCamPos().y - (height() / 2);

    k.get(BUBBLE_TAG).forEach(
      (bubble) => {
        const b = bubble as GameObj<PosComp | VelocityComp>;
        if (b.pos.y < camTop) {
          b.tag(DESTROY);
          return;
        }

        b.move(0, b.speedY * dt);
      }
    );

    destroyAll(DESTROY);
  })

  return { cleanupBubbles };
}

export type BubbleControllerReturn = ReturnType<typeof bubblesController>;