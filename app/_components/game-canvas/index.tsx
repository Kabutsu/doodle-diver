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
import { isMobile } from '@/app/_helpers/platform-detection';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const [, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const kRef = useRef<KAPLAYCtx | null>(null);
  const [mobileInputVisible, setMobileInputVisible] = useState(false);
  const [mobileInputValue, setMobileInputValue] = useState('');
  const [mobileInputCallback, setMobileInputCallback] = useState<((name: string) => void) | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let gameCleanup: (() => void) | undefined;
    let titleCleanup: { cleanup: () => void } | undefined;

    (async () => {
      const mobile = isMobile();
      let width: number;
      let height: number;
      
      if (mobile) {
        // Portrait mode: max 1080w x 1440h
        width = Math.min(window.innerWidth, 1080);
        height = Math.min(window.innerHeight, 1440);
      } else {
        // Desktop: original limits
        width = Math.min(window.innerWidth, 480);
        height = Math.min(window.innerHeight, 1080);
      }

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
          isMobile: mobile,
          onRequestMobileInput: (callback) => {
            setMobileInputValue('');
            setMobileInputCallback(() => callback);
            setMobileInputVisible(true);
          },
          onRestart: () => {
            // Cleanup game
            gameCleanup?.();
            gameCleanup = undefined;
            
            // Return to menu
            setGameState('menu');
            
            // Reinitialize title screen
            titleCleanup = titleScreenController({
              k: kCtx,
              isMobile: mobile,
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
          isMobile: mobile,
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
          isMobile: mobile,
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
        isMobile: mobile,
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
    <>
      <canvas
        ref={canvasRef}
        className="block my-0 mx-auto touch-none"
      />
      {mobileInputVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="relative mx-4 max-w-sm" style={{
            backgroundColor: '#1a1a2e',
            border: '4px solid #ffd700',
            borderRadius: '0',
            boxShadow: '0 0 0 2px #000, 0 0 20px rgba(255, 215, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
          }}>
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-3 h-3 bg-yellow-400" style={{ transform: 'translate(-50%, -50%)' }} />
            <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400" style={{ transform: 'translate(50%, -50%)' }} />
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-yellow-400" style={{ transform: 'translate(-50%, 50%)' }} />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-400" style={{ transform: 'translate(50%, 50%)' }} />
            
            <div className="p-6">
              <div className="text-center mb-6" style={{
                backgroundColor: '#ffd700',
                color: '#1a1a2e',
                padding: '8px',
                fontWeight: 'bold',
                fontSize: '20px',
                letterSpacing: '2px',
                textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
                marginLeft: '-24px',
                marginRight: '-24px',
                marginTop: '-24px',
                marginBottom: '24px',
                borderBottom: '4px solid #000'
              }}>
                ENTER YOUR NAME
              </div>
              
              <div className="mb-4" style={{
                backgroundColor: '#0f0f1e',
                border: '3px solid #00ffff',
                padding: '4px',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
              }}>
                <input
                  type="text"
                  maxLength={12}
                  value={mobileInputValue}
                  onChange={(e) => setMobileInputValue(e.target.value)}
                  className="w-full px-3 py-3 text-xl text-white bg-transparent border-none focus:outline-none"
                  placeholder="Player"
                  autoFocus
                  style={{
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                  }}
                />
              </div>
              
              <div className="text-right mb-4" style={{
                color: '#00ffff',
                fontSize: '14px',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}>
                {mobileInputValue.length}/12
              </div>
              
              <button
                onClick={() => {
                  const name = mobileInputValue.trim() || 'Anonymous';
                  if (mobileInputCallback) {
                    mobileInputCallback(name);
                  }
                  setMobileInputVisible(false);
                  setMobileInputCallback(null);
                }}
                className="w-full font-bold py-3 px-6 text-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#00ff00',
                  color: '#000',
                  border: '3px solid #00aa00',
                  boxShadow: '0 4px 0 #00aa00, 0 6px 8px rgba(0,0,0,0.5)',
                  letterSpacing: '2px',
                  textShadow: '1px 1px 0 rgba(255,255,255,0.3)',
                  fontFamily: 'monospace'
                }}
              >
                ▶ SUBMIT SCORE ◀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameCanvas;
