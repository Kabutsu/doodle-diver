import { CircleComp, GameObj, KAPLAYCtx, PosComp, RectComp } from "kaplay";

const BUBBLE = 'bubble';
const DESTROY = 'bubble_DESTROY';
const COLOR = '#a6dbff';

const MIN_TIMEOUT = 1500;
const MAX_TIMEOUT = 5000;

const SPEED_Y = 9000;
const SPEED_X = 10000;

type Args = {
  k: KAPLAYCtx;
  player: GameObj<PosComp | RectComp>;
};

export function bubblesController({ k, player }: Args) {
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
      BUBBLE,
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
    destroyAll(BUBBLE);
    clearTimeout(timeout);
  };

  onCollide(BUBBLE, 'player', (b, p) => {
    b.destroy();
  })

  onUpdate(() => {
    if (bubblesCleared) {
      return;
    }

    const dt = k.dt();
    const camTop = getCamPos().y - (height() / 2);

    k.get(BUBBLE).forEach(
      (bubble) => {
        const b = bubble as GameObj<PosComp | CircleComp>;
        if (b.pos.y < camTop) {
          b.tag(DESTROY);
          return;
        }

        b.move(0, -SPEED_Y * dt);
      }
    );

    destroyAll(DESTROY);
  })

  return { cleanupBubbles };
}