import health from '@/app/_components/logic/health';
import { getFallSpeedMultiplier, getOxygenDrainMultiplier } from '@/app/_components/logic/depth';
import { MASK_DEFS, type MaskType } from '@/app/_components/logic/mask/types';
import { KAPLAYCtx, Key } from 'kaplay';

export const PLAYER_TAG = 'player';

const BASE_FALL_SPEED = 1500;
const VERTI_SPEED = 7500;
const HORIZ_SPEED = 220;
const BASE_DEPLETION = 2;
const DEPTH_PER_PIXEL = 0.01;

const PLAYER_TARGET_POS = 0.25;
const PLAYER_MIN_POS = 0.1;
const PLAYER_MAX_POS = 0.4;

const BOOST_COST = 7.5;
const KICK_COST = 2.5;
const BOOST_KICK_COOLDOWN_MS = 3500;
const BOOST_KICK_DURATION_MS = 1000;
const BOOST_MODIFIER = 2.5;
const KICK_MODIFIER = 25;

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
    onKeyPress,
    onKeyRelease,
    onUpdate,
    width,
    height,
    destroyAll,
    dt,
  } = k;

  const CENTRE_X = width() / 2;
  const PLAYER_TARGET_Y = Math.round(height() * PLAYER_TARGET_POS);

  const player = add([
    rect(26, 34),
    pos(CENTRE_X, height() * PLAYER_MIN_POS),
    area(),
    health(),
    PLAYER_TAG,
  ]);

  const MIN_X = -(3 * player.width / 4);
  const MAX_X = width() - (player.width / 4);

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
  let boostKickDurationUntil = 0;
  let isBoosting = false;
  let isKicking = false;

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

  const applyBoostOrKick = (cost: number, key: Key) => {
    if (player.oxygen < MIN_OXYGEN_FOR_BOOST) return;

    const now = performance.now();
    if (now < boostKickCooldownUntil || now < slowDebuffUntil) return;
  
    boostKickCooldownUntil = now + BOOST_KICK_COOLDOWN_MS;
    boostKickDurationUntil = now + BOOST_KICK_DURATION_MS;
    player.hurt(cost);
    isBoosting = key === 'space';
    isKicking = ['up', 'down'].includes(key);
  };

  const getSpeedMultiplier = () => {
    switch (true) {
      case performance.now() < slowDebuffUntil:
        return 0.5;
      case isBoosting && performance.now() < boostKickDurationUntil:
        return BOOST_MODIFIER;
      default:
        return 1
    }
  };

  onKeyDown('left', () => {
    if (!isGameOver) {
      const mult = getSpeedMultiplier();
      player.move(-HORIZ_SPEED * mult, 0);
    }
  });
  onKeyDown('right', () => {
    if (!isGameOver) {
      const mult = getSpeedMultiplier();
      player.move(HORIZ_SPEED * mult, 0);
    }
  });
  onKeyDown('up', () => {
    if (isGameOver || !isKicking) return;
    player.move(0, -VERTI_SPEED / KICK_MODIFIER);
  });
  onKeyDown('down', () => {
    if (isGameOver || !isKicking) return;
    player.move(0, VERTI_SPEED / KICK_MODIFIER);
  });

  onKeyPress('space', () => {
    if (isGameOver) return;
    applyBoostOrKick(BOOST_COST, 'space');
  });
  onKeyPress('up', () => {
    if (isGameOver) return;
    applyBoostOrKick(KICK_COST, 'up');
  });
  onKeyPress('down', () => {
    if (isGameOver) return;
    applyBoostOrKick(KICK_COST, 'down');
  });

  onKeyRelease(['left', 'right'], () => {
    isBoosting = false;
  });
  onKeyRelease(['up', 'down'], () => {
    isKicking = false;
  })

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

    player.move(bounceVx * d, 0);
    player.move(currentVx * d, 0);

    bounceVy *= BOUNCE_DECAY * bounceDecay;
    bounceVx *= BOUNCE_DECAY;

    const netDown = Math.max(0, fallSpeed * d - bounceVy * d);
    currentDepth += netDown;
    depth = Math.max(depth, currentDepth * DEPTH_PER_PIXEL);

    if (!pauseDrain) {
      player.hurt(BASE_DEPLETION * drainMult * d);
    }

    if (player.pos.x < MIN_X) player.pos.x = MAX_X;
    if (player.pos.x > MAX_X) player.pos.x = MIN_X;

    if (!isKicking) {
      if (player.pos.y > PLAYER_TARGET_Y + 5) {
        player.move(0, VERTI_SPEED * d * -1);
      }
      else if (player.pos.y < PLAYER_TARGET_Y - 5) {
        player.move(0, VERTI_SPEED * d);
      }
    } else if (now >= boostKickDurationUntil) {
      isKicking = false;
    }

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
