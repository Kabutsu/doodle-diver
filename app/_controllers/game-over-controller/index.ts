import { GameObj, KAPLAYCtx } from 'kaplay';
import { submitScore } from '@/app/_helpers/submit-score';

export type GameOverState = {
  depth: number;
  startTime: number;
};

type Args = {
  k: KAPLAYCtx;
};

function gameOverController({ k }: Args) {
  const { add, text, pos, fixed, width, height, onKeyDown, destroy } = k;

  let isGameOver = false;
  let submitStatusText: GameObj | null = null;

  onKeyDown('enter', () => {
    if (isGameOver) location.reload();
  });

  const handleGameOver = async (state: GameOverState, runCleanups: () => void) => {
    if (isGameOver) return;
    isGameOver = true;

    runCleanups();

    const finalDepth = Math.floor(state.depth);
    const runTimeMs = Math.round(performance.now() - state.startTime);
    const score = finalDepth;

    add([
      text('GAME OVER', { width: width(), align: 'center' }),
      pos(0, height() / 2 - 80),
      fixed(),
    ]);

    add([
      text(`Depth: ${finalDepth}m\nRuntime: ${Math.round(runTimeMs / 100)}s`, {
        width: width(),
        align: 'center',
      }),
      pos(0, height() / 2 - 20),
      fixed(),
    ]);

    submitStatusText = add([
      text('Submitting score...', { width: width(), align: 'center' }),
      pos(0, height() / 2 + 60),
      fixed(),
    ]);

    let playerName = 'Anonymous';
    try {
      const resp = window.prompt('Enter player name for high score', 'Player');
      playerName = resp && resp.trim().length > 0 ? resp.trim() : 'Anonymous';
    } catch {
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

      if (submitStatusText) destroy(submitStatusText);
      submitStatusText = add([
        text('Score submitted! Press Enter to play again.', {
          width: width() - 20,
          align: 'center',
        }),
        pos(0, height() / 2 + 60),
        fixed(),
      ]);
    } catch (err) {
      if (submitStatusText) destroy(submitStatusText);
      submitStatusText = add([
        text('Failed to submit score. Press Enter to retry.', {
          width: width() - 20,
          align: 'center',
        }),
        pos(0, height() / 2 + 60),
        fixed(),
      ]);
      // eslint-disable-next-line no-console
      console.error('Submit score failed', err);
    }
  };

  const cleanup = () => {
    // Game over overlay elements don't need explicit cleanup on unmount;
    // kaplay destroyAll clears everything when canvas unmounts
  };

  return { handleGameOver, cleanup };
}

export default gameOverController;
export type GameOverControllerReturn = ReturnType<typeof gameOverController>;
