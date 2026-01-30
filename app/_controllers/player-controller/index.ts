import { GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';

const FALL_SPEED = 15;
const HORIZ_SPEED = 220;
const DEPLETION_SPEED = 5;

export type PlayerState = {
  depth: number;
  oxygen: number;
  startTime: number;
};

type Args = {
  k: KAPLAYCtx;
  onOxygenDepleted: () => void;
};

function playerController({ k, onOxygenDepleted }: Args) {
  const { add, rect, pos, area, onKeyDown, onUpdate, width, height, setCamPos, destroyAll } = k;

  const player = add([
    rect(26, 34),
    pos(width() / 2, 34),
    area(),
    'player',
  ]) as GameObj<PosComp | RectComp>;

  let depth = 0;
  let oxygen = 100;
  const startTime = performance.now();
  let isGameOver = false;
  let oxygenDepletedCalled = false;

  onKeyDown('left', () => {
    if (!isGameOver) player.move(-HORIZ_SPEED, 0);
  });
  onKeyDown('right', () => {
    if (!isGameOver) player.move(HORIZ_SPEED, 0);
  });

  onUpdate(() => {
    if (isGameOver) return;

    const dt = k.dt();

    player.move(0, FALL_SPEED * dt);
    depth += FALL_SPEED * dt;
    oxygen -= DEPLETION_SPEED * dt;

    if (player.pos.x < -20) player.pos.x = width() + 20;
    if (player.pos.x > width() + 20) player.pos.x = -20;

    setCamPos(width() / 2, player.pos.y + Math.floor(height() / 4));

    if (oxygen <= 0) {
      oxygen = 0;
      isGameOver = true;
      if (!oxygenDepletedCalled) {
        oxygenDepletedCalled = true;
        onOxygenDepleted();
      }
    }
  });

  const getState = (): PlayerState => ({ depth, oxygen, startTime });

  const cleanup = () => {
    destroyAll('player');
  };

  return { player, getState, cleanup };
}

export default playerController;
export type PlayerControllerReturn = ReturnType<typeof playerController>;
