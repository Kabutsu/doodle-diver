import { GameObj, KAPLAYCtx, PosComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { type MaskType, getMaskDuration } from '@/app/_components/logic/mask/types';
import { VelocityComp } from '@/app/_components/logic/velocity';
import { type GameDirectorReturn } from '../game-director';
import * as tags from '@/app/_helpers/tags';

export const MASK_PICKUP_TAG = tags.MASK_PICKUP_TAG;

export type ActiveMask = { type: MaskType; expiresAt: number } | null;

const BASE_FALL_SPEED = 1500;

type Args = {
  k: KAPLAYCtx;
  gameDirector: GameDirectorReturn;
  getFallSpeed: () => number;
};

export default function maskController({ k, gameDirector, getFallSpeed }: Args) {
  const { onCollide, onUpdate, getCamPos, height } = k;

  let activeMask: ActiveMask = null;
  let isCleanedUp = false;

  // Collision handler - pick up mask
  onCollide(MASK_PICKUP_TAG, PLAYER_TAG, (pickup, _p) => {
    const type = gameDirector.getMaskType(pickup as GameObj);
    if (!type) return;
    
    const duration = getMaskDuration(type);
    activeMask = { type, expiresAt: performance.now() + duration * 1000 };
    k.play('mask-ping', { volume: 0.7 });
    pickup.destroy();
  });

  // Update loop - check mask expiration and move pickups
  onUpdate(() => {
    if (isCleanedUp) return;
    
    const now = performance.now();
    if (activeMask && now >= activeMask.expiresAt) {
      activeMask = null;
    }
    
    const fallSpeed = getFallSpeed();
    const speedMultiplier = fallSpeed / BASE_FALL_SPEED;
    const camTop = getCamPos().y - height() / 2 - 50;
    k.get(MASK_PICKUP_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp | VelocityComp>;
      if (o.pos.y < camTop) {
        obj.destroy();
        return;
      }
      o.speedMultiplier = speedMultiplier;
      o.move(0, o.speedY * k.dt());
    });
  });

  const getActiveMask = (): ActiveMask => activeMask;

  const cleanup = () => {
    isCleanedUp = true;
    activeMask = null;
  };

  return { getActiveMask, cleanup };
}

export type MaskControllerReturn = ReturnType<typeof maskController>;
