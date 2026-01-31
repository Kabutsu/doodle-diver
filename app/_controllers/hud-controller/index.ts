import { GameObj, KAPLAYCtx } from 'kaplay';
import type { ActiveMask } from '../mask-controller';

type Args = {
  k: KAPLAYCtx;
  getDepth: () => number;
  getOxygen: () => number;
  getActiveMask?: () => ActiveMask;
};

function hudController({ k, getDepth, getOxygen, getActiveMask }: Args) {
  const { add, text, pos, rect, color, opacity, z, fixed, onUpdate, destroy, width, height } = k;

  const depthLabel = add([
    text('Depth: 0m'),
    pos(8, 8),
    fixed(),
  ]) as GameObj;

  const oxygenLabel = add([
    text('O2: 100%'),
    pos(8, 50),
    fixed(),
  ]) as GameObj;

  const maskLabel = add([
    text(''),
    pos(8, 92),
    fixed(),
  ]) as GameObj;

  const blindOverlay = add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0),
    z(100),
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
  });

  const cleanup = () => {
    isCleanedUp = true;
    destroy(depthLabel);
    destroy(oxygenLabel);
    destroy(maskLabel);
    destroy(blindOverlay);
  };

  return { cleanup };
}

export default hudController;
export type HudControllerReturn = ReturnType<typeof hudController>;
