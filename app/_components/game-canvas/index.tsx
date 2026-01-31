import { useEffect, useRef } from 'react';
import kaplay from 'kaplay';
import gameDirector, { type GameDirectorReturn } from '@/app/_controllers/game-director';
import oxygenTankController from '@/app/_controllers/oxygen-tank-controller';
import bounceController from '@/app/_controllers/bounce-controller';
import gameOverController from '@/app/_controllers/game-over-controller';
import hazardController from '@/app/_controllers/hazard-controller';
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

      const gameDirectorRef: { current: GameDirectorReturn | null } = { current: null };
      const maskCtrlRef: { current: MaskControllerReturn | null } = { current: null };

      const playerCtrl = playerController({
        k,
        onOxygenDepleted: () => {
          const state = playerCtrl.getState();
          gameOverCtrl.handleGameOver(
            { depth: state.depth, startTime: state.startTime },
            () => {
              gameDirectorRef.current?.cleanup();
            }
          );
        },
        getActiveMask: () => maskCtrlRef.current?.getActiveMask() ?? null,
      });

      // Initialize game director first (manages spawning)
      gameDirectorRef.current = gameDirector({
        k,
        getDepth: () => playerCtrl.getState().depth,
      });

      // Initialize effect controllers (handle mechanics only)
      maskCtrlRef.current = maskController({
        k,
        gameDirector: gameDirectorRef.current,
      });

      oxygenTankController({ k });

      bounceController({
        k,
        setBounceVy: playerCtrl.setBounceVy,
        setBounceVx: playerCtrl.setBounceVx,
        getFallSpeed: playerCtrl.getFallSpeed,
      });

      hazardController({
        k,
        player: playerCtrl.player,
        setSlowDebuffUntil: playerCtrl.setSlowDebuffUntil,
        setCurrentVx: playerCtrl.setCurrentVx,
        getFallSpeed: playerCtrl.getFallSpeed,
        gameDirector: gameDirectorRef.current,
      });

      const hudCtrl = hudController({
        k,
        getDepth: () => playerCtrl.getState().depth,
        getOxygen: () => playerCtrl.getState().oxygen,
        getActiveMask: () => maskCtrlRef.current?.getActiveMask() ?? null,
      });

      cleanup = () => {
        gameDirectorRef.current?.cleanup();
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
