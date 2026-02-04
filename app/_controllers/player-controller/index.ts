import health from '@/app/_components/logic/health';
import { getFallSpeedMultiplier, getOxygenDrainMultiplier } from '@/app/_components/logic/depth';
import { MASK_DEFS, type MaskType } from '@/app/_components/logic/mask/types';
import { KAPLAYCtx, Key } from 'kaplay';
import { sprites } from '@/app/_helpers/sprites';

export const PLAYER_TAG = 'player';

const BASE_FALL_SPEED = 1500;
const VERTI_SPEED = 7500;
const HORIZ_SPEED = 220;
const BASE_DEPLETION = 3;
const PRESSURE_DEPLETION_MULT = 5;
const DEPTH_PER_PIXEL = 0.01;

const PLAYER_TARGET_POS = 0.25;
const PLAYER_MIN_POS = 0.1;

const BOOST_COST = 7.5;
const KICK_COST = 2.5;
const BOOST_KICK_COOLDOWN_MS = 3500;
const BOOST_KICK_DURATION_MS = 1000;
const BOOST_MODIFIER = 2.5;
const KICK_MODIFIER = 25;

const BOUNCE_DECAY = 0.92;
const MIN_OXYGEN_FOR_BOOST = 15;
const BOUNCE_DURATION_MS = 600;
const BOUNCE_ROTATION_ANGLE = 25;
const CURRENT_ROTATION_ANGLE = 12;
const FLASH_DURATION_MS = 150;

export type PlayerState = {
  depth: number;
  oxygen: number;
  startTime: number;
};

export type ActiveMask = { type: MaskType; expiresAt: number } | null;

type Args = {
  k: KAPLAYCtx;
  isMobile?: boolean;
  onOxygenDepleted: () => void;
  getActiveMask?: () => ActiveMask;
};

function playerController({ k, isMobile = false, onOxygenDepleted, getActiveMask }: Args) {
  const {
    add,
    pos,
    area,
    body,
    onKeyDown,
    onKeyPress,
    onKeyRelease,
    isKeyDown,
    onUpdate,
    width,
    height,
    destroyAll,
    dt,
    loadSprite,
    sprite,
  } = k;

  loadSprite(sprites.diver.name, `/${sprites.diver.name}.png`);

  const CENTRE_X = width() / 2;
  const PLAYER_TARGET_Y = Math.round(height() * PLAYER_TARGET_POS);

  const player = add([
    pos(CENTRE_X, height() * PLAYER_MIN_POS),
    area(),
    health(),
    body(),
    sprite(sprites.diver.name, { width: sprites.diver.width, height: sprites.diver.height }),
    k.rotate(0),
    k.opacity(1),
    PLAYER_TAG,
  ]);

  const MIN_X = -2 * sprites.diver.width / 3;
  const MAX_X = width() - (sprites.diver.width / 3);
  console.log('playerWidth;MIN_X;MAX_X', sprites.diver.width, MIN_X, MAX_X);

  let depth = 0;
  const startTime = performance.now();
  let isGameOver = false;
  let oxygenDepletedCalled = false;
  let gameReady = false;

  let bounceVy = 0;
  let bounceVx = 0;
  let currentVx = 0;
  let slowDebuffUntil = 0;
  let activeBounceUntil = 0;
  let bounceType: 'upward' | 'downward' | null = null;
  let flashUntil = 0;
  let boostKickCooldownUntil = 0;
  let boostKickDurationUntil = 0;
  let isBoosting = false;
  let isKicking = false;

  const setBounceVy = (v: number, duration = BOUNCE_DURATION_MS, type: 'upward' | 'downward' | null = null) => {
    bounceVy = v;
    activeBounceUntil = performance.now() + duration;
    bounceType = type;
    flashUntil = performance.now() + FLASH_DURATION_MS;
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
    if (!gameReady || player.oxygen < MIN_OXYGEN_FOR_BOOST) return;

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
      if (!isKeyDown('right')) player.flipX = true;
    }
  });
  onKeyDown('right', () => {
    if (!isGameOver) {
      const mult = getSpeedMultiplier();
      player.move(HORIZ_SPEED * mult, 0);
      if (!isKeyDown('left')) player.flipX = false;
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

  // Touch controls for mobile
  const activeTouches = new Map<number, { x: number; y: number; startTime: number; region: string }>();
  const lastTapTimes = { left: 0, right: 0 };
  const DOUBLE_TAP_THRESHOLD_MS = 300;

  if (isMobile && typeof window !== 'undefined') {
    const canvas = k.canvas;
    
    const getTouchRegion = (x: number, y: number) => {
      const screenWidth = width();
      const screenHeight = height();
      const lowerThirdY = screenHeight * 0.8;
      
      if (y >= lowerThirdY) {
        // Lower third - subdivided into 3 zones
        const leftThird = screenWidth / 3;
        const rightThird = screenWidth * 2 / 3;
        
        if (x < leftThird) return 'lower-left';
        if (x > rightThird) return 'lower-right';
        return 'lower-center';
      }
      
      // Upper two-thirds - left or right
      const midX = screenWidth / 2;
      return x < midX ? 'left' : 'right';
    };

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const now = performance.now();
      
      Array.from(e.changedTouches).forEach((touch) => {
        const rect = canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (width() / rect.width);
        const y = (touch.clientY - rect.top) * (height() / rect.height);
        const region = getTouchRegion(x, y);
        
        activeTouches.set(touch.identifier, { x, y, startTime: now, region });
        
        // Check for double-tap boost on sides
        if (region === 'left' || region === 'right') {
          const timeSinceLastTap = now - lastTapTimes[region];
          if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD_MS) {
            // Double-tap detected - trigger boost
            applyBoostOrKick(BOOST_COST, 'space');
          }
          lastTapTimes[region] = now;
        }
        
        // Auto-trigger kick for diagonal lower zones
        if (region.startsWith('lower-')) {
          applyBoostOrKick(KICK_COST, 'down');
        }
      });
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach((touch) => {
        const rect = canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (width() / rect.width);
        const y = (touch.clientY - rect.top) * (height() / rect.height);
        const region = getTouchRegion(x, y);
        
        const existing = activeTouches.get(touch.identifier);
        if (existing) {
          activeTouches.set(touch.identifier, { ...existing, x, y, region });
        }
      });
    });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach((touch) => {
        activeTouches.delete(touch.identifier);
      });
    });

    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      Array.from(e.changedTouches).forEach((touch) => {
        activeTouches.delete(touch.identifier);
      });
    });
  }

  let lastFallSpeed = BASE_FALL_SPEED;

  const getPressureDrainMult = () => {
    if (player.pos.y < 0) return PRESSURE_DEPLETION_MULT;
    return 1;
  }

  let updateEvent: { cancel: () => void } | null = null;
  updateEvent = onUpdate(() => {
    if (isGameOver) return;

    gameReady = true;
    const d = dt();
    const mask = getActiveMask?.() ?? null;
    const now = performance.now();
    const maskActive = mask && mask.expiresAt > now;
    const maskDef = maskActive ? MASK_DEFS[mask.type] : null;

    // Flash effect
    if (now < flashUntil) {
      const flashProgress = (flashUntil - now) / FLASH_DURATION_MS;
      player.opacity = 0.3 + (flashProgress * 0.7);
    } else {
      player.opacity = 1;
    }

    // Process touch controls for mobile
    if (isMobile && !isGameOver) {
      const mult = getSpeedMultiplier();
      let touchMovingLeft = false;
      let touchMovingRight = false;
      let touchMovingDown = false;
      
      activeTouches.forEach((touch) => {
        const { region } = touch;
        
        if (region === 'left') {
          touchMovingLeft = true;
        } else if (region === 'right') {
          touchMovingRight = true;
        } else if (region === 'lower-left') {
          touchMovingLeft = true;
          touchMovingDown = true;
        } else if (region === 'lower-right') {
          touchMovingRight = true;
          touchMovingDown = true;
        } else if (region === 'lower-center') {
          touchMovingDown = true;
        }
      });
      
      // Apply horizontal movement
      if (touchMovingLeft && !touchMovingRight) {
        player.move(-HORIZ_SPEED * mult, 0);
        player.flipX = true;
      } else if (touchMovingRight && !touchMovingLeft) {
        player.move(HORIZ_SPEED * mult, 0);
        player.flipX = false;
      }
      
      // Apply vertical movement (kick)
      if (isKicking && touchMovingDown) {
        player.move(0, VERTI_SPEED / KICK_MODIFIER);
      }
    }

    const fallMult = getFallSpeedMultiplier(depth) * (maskDef?.fallSpeedMult ?? 1);
    const slowMult = performance.now() < slowDebuffUntil ? 0.5 : 1;
    const fallSpeed = BASE_FALL_SPEED * fallMult * slowMult;
    lastFallSpeed = fallSpeed;

    const drainMult = getOxygenDrainMultiplier(depth) * (maskDef?.oxygenDrainMult ?? 1) * getPressureDrainMult();
    const pauseDrain = maskDef?.pauseOxygenDrain ?? false;
    const bounceDecay = maskDef?.bounceDecayMult ?? 1;

    player.move(bounceVx * d, 0);
    player.move(currentVx * d, 0);
    player.move(0, bounceVy * d);

    // Apply rotation based on bounce velocity or current push
    const isBouncing = now < activeBounceUntil;
    const inCurrent = Math.abs(currentVx) > 10;
    
    if (isBouncing && bounceType) {
      const rotationDir = bounceType === 'upward' ? -1 : 1;
      const bounceStrength = Math.abs(bounceVy) / 2000; // normalize
      player.angle = rotationDir * BOUNCE_ROTATION_ANGLE * Math.min(bounceStrength, 1);
    } else if (inCurrent) {
      // Tilt player based on current push direction
      const currentDir = currentVx > 0 ? 1 : -1;
      const currentStrength = Math.min(Math.abs(currentVx) / 600, 1); // normalize (600 = mid strength)
      player.angle = currentDir * CURRENT_ROTATION_ANGLE * currentStrength;
    } else {
      // Smoothly return to neutral position
      player.angle *= 0.85;
      if (Math.abs(player.angle) < 0.5) player.angle = 0;
    }

    // Apply bounce decay (skip decay for jellyfish bounces during active bounce period)
    const isJellyfishBounce = bounceType === 'upward' && bounceVy > 0;
    if (!(isJellyfishBounce && isBouncing)) {
      bounceVy *= BOUNCE_DECAY * bounceDecay;
      bounceVx *= BOUNCE_DECAY;
    }

    // Only increase depth when player is below target position
    if (player.pos.y >= PLAYER_TARGET_Y - player.height) {
      const currentDepth = depth + (lastFallSpeed * d * DEPTH_PER_PIXEL);
      depth = Math.max(depth, currentDepth);
    }

    if (!pauseDrain) {
      player.hurt(BASE_DEPLETION * drainMult * d);
    }

    if (player.pos.x < MIN_X) player.pos.x = MAX_X;
    if (player.pos.x > MAX_X) player.pos.x = MIN_X;

    // Auto-center player vertically (disabled during active bounce)
    if (!isKicking && now >= activeBounceUntil) {
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

  const getPlayerPos = () => ({ x: player.pos.x, y: player.pos.y });

  const cleanup = () => {
    destroyAll(PLAYER_TAG);
    lastFallSpeed = BASE_FALL_SPEED;
    boostKickCooldownUntil = 0;
    boostKickDurationUntil = 0;
    // Cancel update loop to avoid lingering handlers
    if (updateEvent) {
      updateEvent.cancel();
      updateEvent = null;
    }
    // Reset transient movement state
    bounceVy = 0;
    bounceVx = 0;
    currentVx = 0;
    slowDebuffUntil = 0;
    activeBounceUntil = 0;
    bounceType = null;
    flashUntil = 0;
    isBoosting = false;
    isKicking = false;
  };

  return {
    player,
    getState,
    getFallSpeed,
    getPlayerPos,
    setBounceVy,
    setBounceVx,
    setSlowDebuffUntil,
    setCurrentVx,
    getBoostKickState: () => {
      const now = performance.now();
      const hasMinOxygen = player.oxygen >= MIN_OXYGEN_FOR_BOOST;
      const onCooldown = now < boostKickCooldownUntil;
      const isSlowed = now < slowDebuffUntil;
      
      return {
        canUse: hasMinOxygen && !onCooldown && !isSlowed,
        cooldownRemaining: Math.max(0, Math.ceil((boostKickCooldownUntil - now) / 1000)),
        hasMinOxygen,
        isSlowed,
      };
    },
    cleanup,
  };
}

export default playerController;
export type PlayerControllerReturn = ReturnType<typeof playerController>;
