import { GameObj, KAPLAYCtx, PosComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { HealthComp } from '@/app/_components/logic/health';
import { VelocityComp } from '@/app/_components/logic/velocity';
import * as tags from '@/app/_helpers/tags';

export const JELLYFISH_TAG = tags.JELLYFISH_TAG;
export const AIR_VENT_TAG = tags.AIR_VENT_TAG;
export const SHARP_ROCK_TAG = tags.SHARP_ROCK_TAG;

const DESTROY = 'bounce_DESTROY';

const JELLY_VY = 220;
const VENT_VY = 420;
const SHARP_ROCK_DAMAGE = 12;
const SHARP_ROCK_SPIKE = -180;
const JELLY_HURT = 5;

const HIGH_SPEED_THRESHOLD = 25;
const HIGH_SPEED_EXTRA_DAMAGE = 6;
const BASE_FALL_SPEED = 1500;

type Args = {
  k: KAPLAYCtx;
  setBounceVy: (v: number) => void;
  setBounceVx: (v: number) => void;
  getFallSpeed: () => number;
};

export default function bounceController({
  k,
  setBounceVy,
  getFallSpeed,
}: Args) {
  const {
    onCollide,
    onUpdate,
    getCamPos,
    height,
    destroyAll,
  } = k;

  let isCleanedUp = false;

  // Collision handlers
  onCollide(JELLYFISH_TAG, PLAYER_TAG, (b, p) => {
    b.destroy();
    (p as GameObj<HealthComp>).hurt(JELLY_HURT);
    setBounceVy(JELLY_VY);
  });

  onCollide(AIR_VENT_TAG, PLAYER_TAG, (b, p) => {
    setBounceVy(VENT_VY);
  });

  onCollide(SHARP_ROCK_TAG, PLAYER_TAG, (b, p) => {
    const healthObj = p as GameObj<HealthComp>;
    healthObj.hurt(SHARP_ROCK_DAMAGE);
    setBounceVy(SHARP_ROCK_SPIKE);
    if (getFallSpeed() > HIGH_SPEED_THRESHOLD) {
      healthObj.hurt(HIGH_SPEED_EXTRA_DAMAGE);
    }
  });

  // Update loop - move helper objects
  onUpdate(() => {
    if (isCleanedUp) return;

    const dt = k.dt();
    const fallSpeed = getFallSpeed();
    const speedMultiplier = fallSpeed / BASE_FALL_SPEED;

    const camTop = getCamPos().y - height() / 2 - 50;
    [JELLYFISH_TAG, AIR_VENT_TAG, SHARP_ROCK_TAG].forEach((tag) => {
      k.get(tag).forEach((obj) => {
        const o = obj as GameObj<PosComp | VelocityComp>;
        if (o.pos.y < camTop) {
          o.tag(DESTROY);
          return;
        }
        o.speedMultiplier = speedMultiplier;
        o.move(0, o.speedY * dt);
      });
    });
    destroyAll(DESTROY);
  });

  const cleanup = () => {
    isCleanedUp = true;
  };

  return { cleanup };
}

export type BounceControllerReturn = ReturnType<typeof bounceController>;
