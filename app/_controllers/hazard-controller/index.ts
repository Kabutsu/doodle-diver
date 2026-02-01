import { GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { HealthComp } from '@/app/_components/logic/health';
import { VelocityComp } from '@/app/_components/logic/velocity';
import { type GameDirectorReturn } from '../game-director';
import * as tags from '@/app/_helpers/tags';

export const ROCK_TAG = tags.ROCK_TAG;
export const MINE_TAG = tags.MINE_TAG;
export const FISH_TAG = tags.FISH_TAG;
export const CURRENT_TAG = tags.CURRENT_TAG;
export const SIDE_WALL_TAG = tags.SIDE_WALL_TAG;

const ROCK_DAMAGE = 8;
const MINE_DAMAGE = 20;
const FISH_DAMAGE = 6;
const MINE_DEBUFF_MS = 2500;
const HIGH_SPEED_THRESHOLD = 25;
const HIGH_SPEED_EXTRA = 5;

const DESTROY = 'hazard_DESTROY';

type Args = {
  k: KAPLAYCtx;
  player: GameObj<PosComp | RectComp>;
  setSlowDebuffUntil: (ts: number) => void;
  setCurrentVx: (v: number) => void;
  getFallSpeed: () => number;
  gameDirector: GameDirectorReturn;
};

export default function hazardController({
  k,
  player,
  setSlowDebuffUntil,
  setCurrentVx,
  getFallSpeed,
  gameDirector,
}: Args) {
  const {
    onCollide,
    onUpdate,
    getCamPos,
    height,
    width,
    testRectPoint,
    Rect: RectClass,
    destroyAll,
  } = k;

  let isCleanedUp = false;

  // Collision handlers
  onCollide(ROCK_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    h.hurt(ROCK_DAMAGE);
    b.destroy();
  });

  onCollide(MINE_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    setSlowDebuffUntil(performance.now() + MINE_DEBUFF_MS);
    h.hurt(MINE_DAMAGE);
    b.destroy();
  });

  onCollide(FISH_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    const fallSpeed = getFallSpeed();
    h.hurt(FISH_DAMAGE);
    if (fallSpeed > HIGH_SPEED_THRESHOLD) {
      h.hurt(HIGH_SPEED_EXTRA);
    }
    b.destroy();
  });

  // Update loop - handle movement and current effects
  onUpdate(() => {
    if (isCleanedUp) return;

    const dt = k.dt();
    const camTop = getCamPos().y - height() / 2 - 80;
    const fallSpeed = getFallSpeed();
    const baseSpeed = 1500;
    const speedMultiplier = fallSpeed / baseSpeed;

    // Handle currents - check if player is inside and apply force
    setCurrentVx(0);
    k.get(CURRENT_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp & RectComp>;
      const metadata = gameDirector.getCurrentMetadata(obj as GameObj);
      if (!metadata) return;
      
      const r = new RectClass(o.pos, o.width ?? 80, o.height ?? 60);
      if (testRectPoint(r, player.pos)) {
        setCurrentVx(metadata.strength * metadata.dir);
      }
    });

    // Move all hazards and destroy off-screen ones
    [ROCK_TAG, MINE_TAG, FISH_TAG, CURRENT_TAG].forEach((tag) => {
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

    // Fish horizontal movement
    k.get(FISH_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp>;
      const metadata = gameDirector.getFishMetadata(obj as GameObj);
      if (!metadata) return;
      
      o.move(metadata.speedX * dt, 0);
      if (o.pos.x < -50 || o.pos.x > width() + 50) {
        obj.destroy();
      }
    });

    // Move tunnel walls
    k.get(SIDE_WALL_TAG).forEach((obj) => {
      const o = obj as GameObj<RectComp | PosComp | VelocityComp>;
      if (o.pos.y + o.height < camTop) {
        obj.destroy();
        return;
      }
      o.speedMultiplier = speedMultiplier;
      o.move(0, o.speedY * dt);
    });

    destroyAll(DESTROY);
  });

  const cleanup = () => {
    isCleanedUp = true;
  };

  return { cleanup };
}

export type HazardControllerReturn = ReturnType<typeof hazardController>;
