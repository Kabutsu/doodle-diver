import { useEffect, useRef } from 'react';
import kaplay, { GameObj } from 'kaplay';
import { submitScore } from '@/app/_helpers/submit-score';

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

      const { add, rect, pos, onKeyDown, onUpdate, width, height, text, fixed, setCamPos } = k;

      const player = add([
        rect(26, 34),
        pos(width() / 2, 34),
        'player'
      ]);

      const fallSpeed = 15;
      const horizSpeed = 220;
      const depletionSpeed = 5;

      let depth = 0;
      let oxygen = 100;

      const startTime = performance.now();
      let isGameOver = false;

      const depthLabel = add([
        text('Depth: 0m'),
        pos(8, 8),
        fixed()
      ]);

      const oxygenLabel = add([
        text('O2: 100%'),
        pos(8, 50),
        fixed(),
      ]);

      let submitStatusText: GameObj | null = null;

      onKeyDown('left', () => {
        if (!isGameOver) player.move(-horizSpeed, 0);
      });
      onKeyDown('right', () => {
        if (!isGameOver) player.move(horizSpeed, 0);
      });

      onKeyDown('enter', () => {
        if (isGameOver) location.reload();
      });

      async function handleGameOver() {
        if (isGameOver) return;
        isGameOver = true;
        oxygen = 0;

        const finalDepth = Math.floor(depth);
        const runTimeMs = Math.round(performance.now() - startTime);
        const score = finalDepth; // treat depth as the score — adjust if you want a different metric

        // Add a simple overlay (fixed so it doesn't move with camera)
        // Positioning is approximate; adjust to taste.
        add([
          text('GAME OVER', { width: width(), align: 'center' }),
          pos(0, height() / 2 - 80),
          fixed(),
        ]);

        add([
          text(`Depth: ${finalDepth}m\nRuntime: ${Math.round(runTimeMs / 100)}s`, { width: width(), align: 'center' }),
          pos(0, height() / 2 - 20),
          fixed(),
        ]);

        submitStatusText = add([
          text('Submitting score...', { width: width(), align: 'center' }),
          pos(0, height() / 2 + 60),
          fixed(),
        ]);

        // prompt for player name (fallback to Anonymous if canceled)
        let playerName: string | null = 'Anonymous';
        try {
          const resp = window.prompt('Enter player name for high score', 'Player');
          playerName = resp && resp.trim().length > 0 ? resp.trim() : 'Anonymous';
        } catch (e) {
          playerName = 'Anonymous';
        }

        const payload = {
          player: playerName,
          score,
          depth: finalDepth,
          runTimeMs,
        };

        try {
          const res = await submitScore(payload);
          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }

          // Update status text
          // remove and re-add because kaplay text nodes are immutable in many libs — replace by re-adding
          if (submitStatusText) k.destroy(submitStatusText);
          submitStatusText = add([
            text('Score submitted! Press Enter to play again.', { width: width() - 20, align: 'center' }),
            pos(0, height() / 2 + 60),
            fixed(),
          ]);
        } catch (err) {
          if (submitStatusText) k.destroy(submitStatusText);
          submitStatusText = add([
            text('Failed to submit score. Press Enter to retry.', { width: width() - 20, align: 'center' }),
            pos(0, height() / 2 + 60),
            fixed(),
          ]);
          // log for debugging
          // eslint-disable-next-line no-console
          console.error('Submit score failed', err);
        }
      }

      onUpdate(() => {
        const dt = k.dt();

        if (isGameOver) {
          return;
        }

        player.move(0, fallSpeed * dt);
        depth += fallSpeed * dt;
        oxygen -= depletionSpeed * dt;

        if (player.pos.x < -20) player.pos.x = width() + 20;
        if (player.pos.x > width() + 20) player.pos.x = -20;

        depthLabel.text = `Depth: ${Math.floor(depth)}m`;
        oxygenLabel.text = `O2: ${Math.floor(oxygen)}%`;
        setCamPos(width() / 2, player.pos.y + Math.floor(height() / 4));

        if (oxygen <= 0) {
          oxygen = 0;
          oxygenLabel.text= 'O2: 0%';

          void handleGameOver();
        }
      });

      cleanup = () => {
        k.destroyAll('player');
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
