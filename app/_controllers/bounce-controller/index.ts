import { CircleComp, GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { HealthComp } from '@/app/_components/logic/health';
import { getDepthBand } from '@/app/_components/logic/depth';

export const JELLYFISH_TAG = 'jellyfish';
export const AIR_VENT_TAG = 'airVent';
export const SHARP_ROCK_TAG = 'sharpRock';

const DESTROY = 'bounce_DESTROY';

const JELLY_VY = 220;
const VENT_VY = 420;
const SHARP_ROCK_DAMAGE = 12;
const SHARP_ROCK_SPIKE = -180;
const JELLY_HEAL = 10;

const HIGH_SPEED_THRESHOLD = 25;
const HIGH_SPEED_EXTRA_DAMAGE = 6;

const SPAWN_INTERVAL_MS = 2500;
const JELLYFISH_RADIUS = 18;
const VENT_RADIUS = 22;
const ROCK_SIZE = 24;

type Args = {
  k: KAPLAYCtx;
  player: GameObj<PosComp | RectComp>;
  getDepth: () => number;
  setBounceVy: (v: number) => void;
  setBounceVx: (v: number) => void;
  getFallSpeed: () => number;
};

export default function bounceController({
  k,
  player,
  getDepth,
  setBounceVy,
  setBounceVx,
  getFallSpeed,
}: Args) {
  const {
    add,
    circle,
    rect,
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

  let lastSpawnTime = performance.now();
  let isCleanedUp = false;

  function spawnOne() {
    const band = getDepthBand(getDepth());
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 80 + Math.random() * 120;
    const x = 40 + Math.random() * (width() - 80);

    const roll = Math.random();
    if (band === 'early') {
      if (roll < 0.6) {
        add([
          circle(JELLYFISH_RADIUS),
          pos(x, spawnY),
          color(255, 200, 255),
          area(),
          JELLYFISH_TAG,
        ]);
      } else {
        add([
          circle(VENT_RADIUS),
          pos(x, spawnY),
          color(200, 230, 255),
          area(),
          AIR_VENT_TAG,
        ]);
      }
    } else if (band === 'mid') {
      if (roll < 0.4) {
        add([
          circle(JELLYFISH_RADIUS),
          pos(x, spawnY),
          color(255, 200, 255),
          area(),
          JELLYFISH_TAG,
        ]);
      } else if (roll < 0.75) {
        add([
          circle(VENT_RADIUS),
          pos(x, spawnY),
          color(200, 230, 255),
          area(),
          AIR_VENT_TAG,
        ]);
      } else {
        add([
          rect(ROCK_SIZE, ROCK_SIZE),
          pos(x, spawnY),
          color(100, 100, 110),
          area(),
          SHARP_ROCK_TAG,
        ]);
      }
    } else {
      if (roll < 0.35) {
        add([
          circle(JELLYFISH_RADIUS),
          pos(x, spawnY),
          color(255, 200, 255),
          area(),
          JELLYFISH_TAG,
        ]);
      } else if (roll < 0.6) {
        add([
          circle(VENT_RADIUS),
          pos(x, spawnY),
          color(200, 230, 255),
          area(),
          AIR_VENT_TAG,
        ]);
      } else {
        add([
          rect(ROCK_SIZE, ROCK_SIZE),
          pos(x, spawnY),
          color(100, 100, 110),
          area(),
          SHARP_ROCK_TAG,
        ]);
      }
    }
  }

  onCollide(JELLYFISH_TAG, PLAYER_TAG, (b, p) => {
    b.destroy();
    (p as GameObj<HealthComp>).heal(JELLY_HEAL);
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

  onUpdate(() => {
    if (isCleanedUp) return;

    const now = performance.now();
    if (now - lastSpawnTime > SPAWN_INTERVAL_MS) {
      lastSpawnTime = now;
      spawnOne();
    }

    const camTop = getCamPos().y - height() / 2 - 50;
    [JELLYFISH_TAG, AIR_VENT_TAG, SHARP_ROCK_TAG].forEach((tag) => {
      k.get(tag).forEach((obj) => {
        const o = obj as GameObj<PosComp>;
        if (o.pos.y < camTop) o.tag(DESTROY);
      });
    });
    destroyAll(DESTROY);
  });

  const cleanup = () => {
    isCleanedUp = true;
    destroyAll(JELLYFISH_TAG);
    destroyAll(AIR_VENT_TAG);
    destroyAll(SHARP_ROCK_TAG);
  };

  return { cleanup };
}

export type BounceControllerReturn = ReturnType<typeof bounceController>;
