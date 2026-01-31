import { useEffect, useRef } from 'react';
import kaplay from 'kaplay';
import bubbleController, { type BubbleControllerReturn } from '@/app/_controllers/bubble-controller';
import bounceController, { type BounceControllerReturn } from '@/app/_controllers/bounce-controller';
import gameOverController from '@/app/_controllers/game-over-controller';
import hazardController, { type HazardControllerReturn } from '@/app/_controllers/hazard-controller';
import hudController from '@/app/_controllers/hud-controller';
import maskController, { type MaskControllerReturn } from '@/app/_controllers/mask-controller';
import playerController from '@/app/_controllers/player-controller';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      const k = kaplay({
        canvas: canvasRef.current!,
        width: 480,
        height: window.innerHeight,
      });

      const gameOverCtrl = gameOverController({ k });

      const bubbleCtrlRef: { current: BubbleControllerReturn | null } = { current: null };
      const bounceCtrlRef: { current: BounceControllerReturn | null } = { current: null };
      const maskCtrlRef: { current: MaskControllerReturn | null } = { current: null };
      const hazardCtrlRef: { current: HazardControllerReturn | null } = { current: null };

      const playerCtrl = playerController({
        k,
        onOxygenDepleted: () => {
          const state = playerCtrl.getState();
          gameOverCtrl.handleGameOver(
            { depth: state.depth, startTime: state.startTime },
            () => {
              bubbleCtrlRef.current?.cleanupBubbles();
              bounceCtrlRef.current?.cleanup();
              maskCtrlRef.current?.cleanup();
              hazardCtrlRef.current?.cleanup();
            }
          );
        },
        getActiveMask: () => maskCtrlRef.current?.getActiveMask() ?? null,
      });

      bubbleCtrlRef.current = bubbleController({ k, player: playerCtrl.player });
      maskCtrlRef.current = maskController({
        k,
        getDepth: () => playerCtrl.getState().depth,
        player: playerCtrl.player,
      });
      bounceCtrlRef.current = bounceController({
        k,
        player: playerCtrl.player,
        getDepth: () => playerCtrl.getState().depth,
        setBounceVy: playerCtrl.setBounceVy,
        setBounceVx: playerCtrl.setBounceVx,
        getFallSpeed: playerCtrl.getFallSpeed,
      });
      hazardCtrlRef.current = hazardController({
        k,
        player: playerCtrl.player,
        getDepth: () => playerCtrl.getState().depth,
        setSlowDebuffUntil: playerCtrl.setSlowDebuffUntil,
        setCurrentVx: playerCtrl.setCurrentVx,
        getFallSpeed: playerCtrl.getFallSpeed,
      });

      const hudCtrl = hudController({
        k,
        getDepth: () => playerCtrl.getState().depth,
        getOxygen: () => playerCtrl.getState().oxygen,
        getActiveMask: () => maskCtrlRef.current?.getActiveMask() ?? null,
      });

      cleanup = () => {
        bubbleCtrlRef.current?.cleanupBubbles();
        bounceCtrlRef.current?.cleanup();
        maskCtrlRef.current?.cleanup();
        hazardCtrlRef.current?.cleanup();
        playerCtrl.cleanup();
        hudCtrl.cleanup();
        gameOverCtrl.cleanup();
      };

      cleanupRef.current = cleanup;
    })();

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block my-0 mx-auto touch-none"
    />
  );
};

export default GameCanvas;
