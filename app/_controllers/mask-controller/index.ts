import { GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { getDepthBand } from '@/app/_components/logic/depth';
import { type MaskType, getMaskDuration } from '@/app/_components/logic/mask/types';

export const MASK_PICKUP_TAG = 'maskPickup';

const PICKUP_SIZE = 20;
const SPAWN_INTERVAL_MS = 12000;
const MASK_COLORS: Record<MaskType, [number, number, number]> = {
  pressure: [100, 150, 200],
  rebreather: [80, 200, 120],
  blind: [60, 60, 80],
};

export type ActiveMask = { type: MaskType; expiresAt: number } | null;

type Args = {
  k: KAPLAYCtx;
  getDepth: () => number;
  player: GameObj<PosComp | RectComp>;
};

export default function maskController({ k, getDepth, player }: Args) {
  const { add, rect, pos, color, area, width, height, onCollide, onUpdate, getCamPos, destroyAll } = k;

  let activeMask: ActiveMask = null;
  let lastSpawnTime = performance.now();
  let isCleanedUp = false;

  const maskTypes: MaskType[] = ['pressure', 'rebreather', 'blind'];

  const pickupTypeMap = new Map<GameObj, MaskType>();

  function spawnPickup() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 60 + Math.random() * 100;
    const x = 30 + Math.random() * (width() - 60);
    const type = maskTypes[Math.floor(Math.random() * maskTypes.length)];
    const obj = add([
      rect(PICKUP_SIZE, PICKUP_SIZE),
      pos(x, spawnY),
      color(...MASK_COLORS[type]),
      area(),
      MASK_PICKUP_TAG,
    ]) as GameObj;
    pickupTypeMap.set(obj, type);
  }

  onCollide(MASK_PICKUP_TAG, PLAYER_TAG, (pickup, _p) => {
    const type = pickupTypeMap.get(pickup as GameObj) ?? maskTypes[0];
    pickupTypeMap.delete(pickup as GameObj);
    const duration = getMaskDuration(type);
    activeMask = { type, expiresAt: performance.now() + duration * 1000 };
    pickup.destroy();
  });

  onUpdate(() => {
    if (isCleanedUp) return;
    const now = performance.now();
    if (activeMask && now >= activeMask.expiresAt) {
      activeMask = null;
    }
    if (now - lastSpawnTime > SPAWN_INTERVAL_MS) {
      lastSpawnTime = now;
      spawnPickup();
    }
    const camTop = getCamPos().y - height() / 2 - 50;
    k.get(MASK_PICKUP_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp>;
      if (o.pos.y < camTop) {
        pickupTypeMap.delete(obj as GameObj);
        obj.destroy();
      }
    });
  });

  const getActiveMask = (): ActiveMask => activeMask;

  const cleanup = () => {
    isCleanedUp = true;
    activeMask = null;
    pickupTypeMap.clear();
    destroyAll(MASK_PICKUP_TAG);
  };

  return { getActiveMask, cleanup };
}

export type MaskControllerReturn = ReturnType<typeof maskController>;
