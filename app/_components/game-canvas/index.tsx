import { useEffect, useRef, useState } from 'react';
import kaplay from 'kaplay';
import gameDirector, { type GameDirectorReturn } from '@/app/_controllers/game-director';
import oxygenTankController from '@/app/_controllers/oxygen-tank-controller';
import bounceController from '@/app/_controllers/bounce-controller';
import gameOverController from '@/app/_controllers/game-over-controller';
import hazardController from '@/app/_controllers/hazard-controller';
import hudController from '@/app/_controllers/hud-controller';
import maskController, { type MaskControllerReturn } from '@/app/_controllers/mask-controller';
import playerController from '@/app/_controllers/player-controller';
import titleScreenController from '@/app/_controllers/title-screen-controller';
import type { KAPLAYCtx } from 'kaplay';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const [, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const kRef = useRef<KAPLAYCtx | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let gameCleanup: (() => void) | undefined;
    let titleCleanup: { cleanup: () => void } | undefined;

    (async () => {
      const width = Math.min(window.innerWidth, 480);
      const height = Math.min(window.innerHeight, 1080);

      const k = kaplay({
        canvas: canvasRef.current!,
        width,
        height,
      });

      kRef.current = k;

      // Load and set background image
      k.loadSprite('background', '/background.png');
      
      const bgObj = k.add([
        k.sprite('background'),
        k.pos(0, 0),
        k.anchor('topleft'),
        k.fixed(),
        k.layer('bg'),
        k.scale(1),
      ]);

      // Scale to fit vertically and center horizontally
      k.onLoad(() => {
        const bgHeight = bgObj.height;
        const bgWidth = bgObj.width;
        if (bgHeight > 0) {
          const scale = height / bgHeight;
          bgObj.scale = k.vec2(scale);
          // Center horizontally in the 480px width
          bgObj.pos.x = (width - bgWidth * scale) / 2;
        }
      });

      // Function to start the actual game
      const startGame = (kCtx: KAPLAYCtx) => {
        const gameOverCtrl = gameOverController({ 
          k: kCtx,
          onRestart: () => {
            // Cleanup game
            gameCleanup?.();
            gameCleanup = undefined;
            
            // Return to menu
            setGameState('menu');
            
            // Reinitialize title screen
            titleCleanup = titleScreenController({
              k: kCtx,
              onStart: () => {
                if (titleCleanup) {
                  titleCleanup.cleanup();
                  titleCleanup = undefined;
                }
                setGameState('playing');
                startGame(kCtx);
              },
            });
          },
        });

        const gameDirectorRef: { current: GameDirectorReturn | null } = { current: null };
        const maskCtrlRef: { current: MaskControllerReturn | null } = { current: null };

        const playerCtrl = playerController({
          k: kCtx,
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
          k: kCtx,
          getDepth: () => playerCtrl.getState().depth,
        });

        // Initialize effect controllers (handle mechanics only)
        maskCtrlRef.current = maskController({
          k: kCtx,
          gameDirector: gameDirectorRef.current,
          getFallSpeed: playerCtrl.getFallSpeed,
        });

        oxygenTankController({ 
          k: kCtx,
          getFallSpeed: playerCtrl.getFallSpeed,
        });

        bounceController({
          k: kCtx,
          setBounceVy: playerCtrl.setBounceVy,
          setBounceVx: playerCtrl.setBounceVx,
          getFallSpeed: playerCtrl.getFallSpeed,
        });

        hazardController({
          k: kCtx,
          player: playerCtrl.player,
          setSlowDebuffUntil: playerCtrl.setSlowDebuffUntil,
          setCurrentVx: playerCtrl.setCurrentVx,
          getFallSpeed: playerCtrl.getFallSpeed,
          gameDirector: gameDirectorRef.current,
        });

        const hudCtrl = hudController({
          k: kCtx,
          getDepth: () => playerCtrl.getState().depth,
          getOxygen: () => playerCtrl.getState().oxygen,
          getActiveMask: () => maskCtrlRef.current?.getActiveMask() ?? null,
          getBoostKickState: () => playerCtrl.getBoostKickState(),
          getPlayerPos: () => playerCtrl.getPlayerPos(),
        });

        gameCleanup = () => {
          gameDirectorRef.current?.cleanup();
          playerCtrl.cleanup();
          hudCtrl.cleanup();
          gameOverCtrl.cleanup();
        };
      };

      // Show title screen initially
      const titleCtrl = titleScreenController({
        k,
        onStart: () => {
          titleCtrl.cleanup();
          setGameState('playing');
          startGame(k);
        },
      });

      titleCleanup = titleCtrl;

      cleanup = () => {
        titleCleanup?.cleanup();
        gameCleanup?.();
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
