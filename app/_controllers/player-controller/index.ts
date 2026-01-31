import health from '@/app/_components/logic/health';
import { getFallSpeedMultiplier, getOxygenDrainMultiplier } from '@/app/_components/logic/depth';
import { MASK_DEFS, type MaskType } from '@/app/_components/logic/mask/types';
import { KAPLAYCtx } from 'kaplay';

export const PLAYER_TAG = 'player';

const BASE_FALL_SPEED = 1000;
const HORIZ_SPEED = 220;
const BASE_DEPLETION = 2;
const DEPTH_PER_PIXEL = 0.01;

const BOOST_UP = 280;
const BOOST_DOWN = 450;
const KICK_UP = 180;
const KICK_DOWN = 200;
const BOOST_KICK_COST = 8;
const BOOST_KICK_COOLDOWN_MS = 400;

const BOUNCE_DECAY = 0.92;
const MIN_OXYGEN_FOR_BOOST = 15;

export type PlayerState = {
  depth: number;
  oxygen: number;
  startTime: number;
};

export type ActiveMask = { type: MaskType; expiresAt: number } | null;

type Args = {
  k: KAPLAYCtx;
  onOxygenDepleted: () => void;
  getActiveMask?: () => ActiveMask;
};

function playerController({ k, onOxygenDepleted, getActiveMask }: Args) {
  const {
    add,
    rect,
    pos,
    area,
    onKeyDown,
    onUpdate,
    width,
    height,
    setCamPos,
    destroyAll,
    isKeyDown,
    dt,
  } = k;

  const player = add([
    rect(26, 34),
    pos(width() / 2, 34),
    area(),
    health(),
    PLAYER_TAG,
  ]);

  let depth = 0;
  let currentDepth = 0;
  const startTime = performance.now();
  let isGameOver = false;
  let oxygenDepletedCalled = false;

  let bounceVy = 0;
  let bounceVx = 0;
  let currentVx = 0;
  let slowDebuffUntil = 0;
  let boostKickCooldownUntil = 0;

  let cameraY = player.pos.y + Math.floor(height() / 4);
  const TRIGGER_OFFSET = height() / 4;

  const setBounceVy = (v: number) => {
    bounceVy = v;
  };
  const setBounceVx = (v: number) => {
    bounceVx = v;
  };
  const setSlowDebuffUntil = (ts: number) => {
    slowDebuffUntil = ts;
  };
  const setCurrentVx = (v: number) => {
    currentVx = v;
  };

  const applyBoostOrKick = (cost: number) => {
    if (player.oxygen < MIN_OXYGEN_FOR_BOOST) return;
    const now = performance.now();
    if (now < boostKickCooldownUntil) return;
    boostKickCooldownUntil = now + BOOST_KICK_COOLDOWN_MS;
    player.hurt(cost);
  };

  onKeyDown('left', () => {
    if (!isGameOver) {
      const mult = performance.now() < slowDebuffUntil ? 0.5 : 1;
      player.move(-HORIZ_SPEED * mult, 0);
    }
  });
  onKeyDown('right', () => {
    if (!isGameOver) {
      const mult = performance.now() < slowDebuffUntil ? 0.5 : 1;
      player.move(HORIZ_SPEED * mult, 0);
    }
  });

  onKeyDown('space', () => {
    if (isGameOver) return;
    if (isKeyDown('up')) {
      bounceVy = BOOST_UP;
      applyBoostOrKick(BOOST_KICK_COST);
    } else {
      const d = dt();
      player.move(0, BOOST_DOWN * d);
      applyBoostOrKick(BOOST_KICK_COST);
    }
  });

  onKeyDown('up', () => {
    if (isGameOver) return;
    bounceVy = KICK_UP;
    applyBoostOrKick(BOOST_KICK_COST);
  });
  onKeyDown('down', () => {
    if (isGameOver) return;
    const d = dt();
    player.move(0, KICK_DOWN * d);
    applyBoostOrKick(BOOST_KICK_COST);
  });

  let lastFallSpeed = BASE_FALL_SPEED;

  onUpdate(() => {
    if (isGameOver) return;

    const d = dt();
    const mask = getActiveMask?.() ?? null;
    const now = performance.now();
    const maskActive = mask && mask.expiresAt > now;
    const maskDef = maskActive ? MASK_DEFS[mask.type] : null;

    const fallMult = getFallSpeedMultiplier(depth) * (maskDef?.fallSpeedMult ?? 1);
    const slowMult = performance.now() < slowDebuffUntil ? 0.5 : 1;
    const fallSpeed = BASE_FALL_SPEED * fallMult * slowMult;
    lastFallSpeed = fallSpeed;

    const drainMult = getOxygenDrainMultiplier(depth) * (maskDef?.oxygenDrainMult ?? 1);
    const pauseDrain = maskDef?.pauseOxygenDrain ?? false;
    const bounceDecay = maskDef?.bounceDecayMult ?? 1;

    player.move(bounceVx * d, -bounceVy * d);
    player.move(0, fallSpeed * d);
    player.move(currentVx * d, 0);

    bounceVy *= BOUNCE_DECAY * bounceDecay;
    bounceVx *= BOUNCE_DECAY;

    const netDown = Math.max(0, fallSpeed * d - bounceVy * d);
    currentDepth += netDown;
    depth = Math.max(depth, currentDepth * DEPTH_PER_PIXEL);

    if (!pauseDrain) {
      player.hurt(BASE_DEPLETION * drainMult * d);
    }

    if (player.pos.x < -20) player.pos.x = width() + 20;
    if (player.pos.x > width() + 20) player.pos.x = -20;

    if (player.pos.y > cameraY - height() / 2 + TRIGGER_OFFSET) {
      cameraY = player.pos.y - TRIGGER_OFFSET + height() / 2;
    }
    setCamPos(width() / 2, cameraY);

    if (player.oxygen <= 0) {
      player.oxygen = 0;
      isGameOver = true;
      if (!oxygenDepletedCalled) {
        oxygenDepletedCalled = true;
        onOxygenDepleted();
      }
    }
  });

  const getState = (): PlayerState => ({
    depth,
    oxygen: player.oxygen,
    startTime,
  });

  const getFallSpeed = () => lastFallSpeed;

  const cleanup = () => {
    destroyAll(PLAYER_TAG);
  };

  return {
    player,
    getState,
    getFallSpeed,
    setBounceVy,
    setBounceVx,
    setSlowDebuffUntil,
    setCurrentVx,
    cleanup,
  };
}

export default playerController;
export type PlayerControllerReturn = ReturnType<typeof playerController>;
