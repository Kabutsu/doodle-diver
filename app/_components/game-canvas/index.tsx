import { useEffect, useRef } from 'react';
import kaplay from 'kaplay';
import bubbleController, { type BubbleControllerReturn } from '@/app/_controllers/bubble-controller';
import gameOverController from '@/app/_controllers/game-over-controller';
import hudController from '@/app/_controllers/hud-controller';
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
      const playerCtrl = playerController({
        k,
        onOxygenDepleted: () => {
          const state = playerCtrl.getState();
          gameOverCtrl.handleGameOver(
            { depth: state.depth, startTime: state.startTime },
            () => bubbleCtrlRef.current?.cleanupBubbles()
          );
        },
      });

      bubbleCtrlRef.current = bubbleController({ k, player: playerCtrl.player });

      const hudCtrl = hudController({
        k,
        getDepth: () => playerCtrl.getState().depth,
        getOxygen: () => playerCtrl.getState().oxygen,
      });

      cleanup = () => {
        bubbleCtrlRef.current?.cleanupBubbles();
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
