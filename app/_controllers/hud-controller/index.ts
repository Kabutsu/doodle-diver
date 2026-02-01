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
};

function hudController({ k, getDepth, getOxygen, getActiveMask, getBoostKickState }: Args) {
  const { add, text, pos, rect, color, opacity, z, fixed, onUpdate, destroy, width, height, anchor } = k;

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

  const blindOverlay = add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0),
    z(9),
    fixed(),
  ]) as GameObj;

  let isCleanedUp = false;

  onUpdate(() => {
    if (isCleanedUp) return;
    depthLabel.text = `Depth: ${Math.floor(getDepth())}m`;
    oxygenLabel.text = `O2: ${Math.floor(getOxygen())}%`;

    const mask = getActiveMask?.() ?? null;
    const now = performance.now();
    if (mask && mask.expiresAt > now) {
      const secs = Math.ceil((mask.expiresAt - now) / 1000);
      const name = mask.type.charAt(0).toUpperCase() + mask.type.slice(1);
      maskLabel.text = `${name} ${secs}s`;
      maskLabel.hidden = false;
      if (mask.type === 'blind') {
        blindOverlay.opacity = 0.6;
      } else {
        blindOverlay.opacity = 0;
      }
    } else {
      maskLabel.text = '';
      maskLabel.hidden = true;
      blindOverlay.opacity = 0;
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
    destroy(blindOverlay);
  };

  return { cleanup };
}

export default hudController;
export type HudControllerReturn = ReturnType<typeof hudController>;
