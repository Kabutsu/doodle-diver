import { GameObj, KAPLAYCtx } from 'kaplay';

type Args = {
  k: KAPLAYCtx;
  getDepth: () => number;
  getOxygen: () => number;
};

function hudController({ k, getDepth, getOxygen }: Args) {
  const { add, text, pos, fixed, onUpdate, destroy } = k;

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

  let isCleanedUp = false;

  onUpdate(() => {
    if (isCleanedUp) return;
    depthLabel.text = `Depth: ${Math.floor(getDepth())}m`;
    oxygenLabel.text = `O2: ${Math.floor(getOxygen())}%`;
  });

  const cleanup = () => {
    isCleanedUp = true;
    destroy(depthLabel);
    destroy(oxygenLabel);
  };

  return { cleanup };
}

export default hudController;
export type HudControllerReturn = ReturnType<typeof hudController>;
