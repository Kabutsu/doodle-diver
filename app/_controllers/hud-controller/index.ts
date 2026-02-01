import { GameObj, KAPLAYCtx } from 'kaplay';
import type { ActiveMask } from '../mask-controller';

type Args = {
  k: KAPLAYCtx;
  getDepth: () => number;
  getOxygen: () => number;
  getActiveMask?: () => ActiveMask;
  getBoostKickState?: () => {
    canUse: boolean;
    cooldownRemaining: number;
    hasMinOxygen: boolean;
    isSlowed: boolean;
  };
  getPlayerPos?: () => { x: number; y: number };
};

function hudController({ k, getDepth, getOxygen, getActiveMask, getBoostKickState, getPlayerPos }: Args) {
  const { add, text, pos, rect, color, opacity, z, fixed, onUpdate, destroy, width, height, anchor, circle } = k;

  const depthLabel = add([
    text('Depth: 0m'),
    pos(8, 8),
    z(10),
    fixed(),
  ]) as GameObj;

  const oxygenLabel = add([
    text('O2: 100%'),
    pos(8, 50),
    z(10),
    fixed(),
  ]) as GameObj;

  const maskLabel = add([
    text(''),
    pos(8, 92),
    z(10),
    fixed(),
  ]) as GameObj;

  const boostKickLabel = add([
    text('', { size: 20 }),
    pos(width() - 10, 10),
    anchor('topright'),
    z(10),
    fixed(),
  ]) as GameObj;

  // Progressive darkness overlay (increases with depth)
  const depthDarknessOverlay = add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0),
    z(8),
    fixed(),
  ]) as GameObj;

  // Vignette effect for blind mask (concentric circles)
  const maxDimension = Math.max(width(), height());
  const vignetteCircles: GameObj[] = [];
  
  // Create 5 concentric circles with increasing radius and opacity
  for (let i = 0; i < 5; i++) {
    const radius = maxDimension * (0.15 + i * 0.25);
    const vignetteCircle = add([
      circle(radius),
      pos(width() / 2, height() / 2),
      color(0, 0, 0),
      opacity(0),
      z(9),
      fixed(),
      anchor('center'),
    ]) as GameObj;
    vignetteCircles.push(vignetteCircle);
  }

  let isCleanedUp = false;

  onUpdate(() => {
    if (isCleanedUp) return;
    depthLabel.text = `Depth: ${Math.floor(getDepth())}m`;
    oxygenLabel.text = `O2: ${Math.floor(getOxygen())}%`;

    // Update progressive darkness based on depth (exponential, max 90% at 3000m)
    const depth = getDepth();
    const maxDepth = 3000;
    const depthProgress = Math.min(depth / maxDepth, 1);
    const darknessOpacity = depthProgress * depthProgress * 0.9; // Exponential curve
    depthDarknessOverlay.opacity = darknessOpacity;

    const mask = getActiveMask?.() ?? null;
    const now = performance.now();
    if (mask && mask.expiresAt > now) {
      const secs = Math.ceil((mask.expiresAt - now) / 1000);
      const name = mask.type.charAt(0).toUpperCase() + mask.type.slice(1);
      maskLabel.text = `${name} ${secs}s`;
      maskLabel.hidden = false;
      if (mask.type === 'blind') {
        // Update vignette position to follow player
        const playerPos = getPlayerPos?.() ?? { x: width() / 2, y: height() / 2 };
        vignetteCircles.forEach((circle, i) => {
          circle.pos.x = playerPos.x;
          circle.pos.y = playerPos.y;
          const circleOpacity = (i + 1) * 0.18;
          circle.opacity = circleOpacity;
        });
      } else {
        // Hide vignette circles when not blind
        vignetteCircles.forEach(circle => {
          circle.opacity = 0;
        });
      }
    } else {
      maskLabel.text = '';
      maskLabel.hidden = true;
      // Hide vignette circles when no mask active
      vignetteCircles.forEach(circle => {
        circle.opacity = 0;
      });
    }

    // Boost indicator
    const boostState = getBoostKickState?.();
    if (boostState) {
      if (boostState.canUse) {
        boostKickLabel.text = 'Boost: READY';
        boostKickLabel.color = k.rgb(0, 255, 0); // Green
      } else if (boostState.cooldownRemaining > 0) {
        boostKickLabel.text = `Boost: ${boostState.cooldownRemaining}s`;
        boostKickLabel.color = k.rgb(255, 255, 0); // Yellow
      } else if (!boostState.hasMinOxygen) {
        boostKickLabel.text = 'Boost: LOW O2';
        boostKickLabel.color = k.rgb(255, 0, 0); // Red
      } else if (boostState.isSlowed) {
        boostKickLabel.text = 'Boost: SLOWED';
        boostKickLabel.color = k.rgb(255, 0, 0); // Red
      }
      boostKickLabel.hidden = false;
    } else {
      boostKickLabel.hidden = true;
    }
  });

  const cleanup = () => {
    isCleanedUp = true;
    destroy(depthLabel);
    destroy(oxygenLabel);
    destroy(maskLabel);
    destroy(boostKickLabel);
    destroy(depthDarknessOverlay);
    vignetteCircles.forEach(circle => destroy(circle));
  };

  return { cleanup };
}

export default hudController;
export type HudControllerReturn = ReturnType<typeof hudController>;
