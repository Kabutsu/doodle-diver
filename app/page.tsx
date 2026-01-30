'use client';

import { useEffect, useRef } from 'react';
import kaplay, { GameObj } from 'kaplay';
import { submitScore } from '@/app/_helpers/submit-score';

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawGameKey =
    typeof module !== 'undefined' && (module as unknown as { hot?: { data?: { gameKey?: number } } }).hot?.data?.gameKey;
  const gameKey: number = typeof rawGameKey === 'number' ? rawGameKey : 0;
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (typeof module !== 'undefined') {
      const hot = (module as unknown as { hot?: { accept: () => void; data: { gameKey?: number }; dispose: (cb: () => void) => void } }).hot;
      if (hot) {
        hot.dispose(() => {
          cleanupRef.current?.();
          hot.data.gameKey = (hot.data.gameKey || 0) + 1;
        });
        hot.accept();
      }
    }

    (async () => {
      const k = kaplay({
        canvas: canvasRef.current!,
        width: 480,
        height: 720,
        // clearColor: [0, 0.05, 0.12]
      });

      const { add, rect, pos, onKeyDown, onUpdate, width, height, text, fixed, setCamPos } = k;

      const player = add([
        rect(26, 34),
        pos(width() / 2, 100),
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

      let gameOverText: GameObj | null = null;
      let statsText: GameObj | null = null;
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
        gameOverText = add([
          text('GAME OVER'),
          pos(width() / 2 - 90, height() / 2 - 80),
          fixed(),
        ]);

        statsText = add([
          text(`Depth: ${finalDepth}m\nRuntime: ${Math.round(runTimeMs)} ms`),
          pos(width() / 2 - 90, height() / 2 - 20),
          fixed(),
        ]);

        submitStatusText = add([
          text('Submitting score...'),
          pos(width() / 2 - 90, height() / 2 + 60),
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
            text('Score submitted! Press Enter to play again.'),
            pos(width() / 2 - 140, height() / 2 + 60),
            fixed(),
          ]);
        } catch (err) {
          if (submitStatusText) k.destroy(submitStatusText);
          submitStatusText = add([
            text('Failed to submit score. Press Enter to retry.'),
            pos(width() / 2 - 140, height() / 2 + 60),
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
        setCamPos(240, player.pos.y);

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
  }, [gameKey]);

  return (
    <canvas
      key={gameKey}
      ref={canvasRef}
      style={{
        display: 'block',
        margin: '0 auto',
        touchAction: 'none'
      }}
    />
  );
}