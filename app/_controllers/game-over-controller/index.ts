import { GameObj, KAPLAYCtx } from 'kaplay';
import { submitScore } from '@/app/_helpers/submit-score';

export type GameOverState = {
  depth: number;
  startTime: number;
};

type Args = {
  k: KAPLAYCtx;
  onRestart: () => void;
};

type LeaderboardEntry = {
  player: string;
  score: number;
  depth: number;
};

type LeaderboardResponse = {
  rows: LeaderboardEntry[];
};

function gameOverController({ k, onRestart }: Args) {
  const { add, text, pos, fixed, z, width, height, onKeyPress, onUpdate, destroy, rect, color, opacity, anchor, dt } = k;

  const CENTRE_X = width() / 2;
  const MAX_NAME_LENGTH = 12;

  let phase: 'input' | 'submitting' | 'success' | 'error' = 'input';
  let playerName = '';
  let cursorBlink = 0;
  let showCursor = true;

  // UI elements
  const uiElements: GameObj[] = [];
  let inputDisplay: GameObj | null = null;
  let characterCounter: GameObj | null = null;
  let promptText: GameObj | null = null;
  let statusText: GameObj | null = null;
  let titleText: GameObj | null = null;
  let statsText: GameObj | null = null;

  // Animation state
  let time = 0;
  let titleScale = 1;
  let titleScaleDir = 1;
  let celebrationTime = 0;
  let showCelebration = false;
  let playerRank: number | null = null;

  // Event handlers
  let keyPressHandlers: Array<{ cancel: () => void }> = [];
  let updateHandler: { cancel: () => void } | null = null;

  const handleGameOver = async (state: GameOverState, runCleanups: () => void) => {
    runCleanups();

    const finalDepth = Math.floor(state.depth);
    const runTimeMs = Math.round(performance.now() - state.startTime);
    const score = finalDepth;

    // Semi-transparent overlay
    const overlay = add([
      rect(width(), height()),
      pos(0, 0),
      color(0, 0, 0),
      opacity(0.5),
      z(10),
      fixed(),
    ]) as GameObj;
    uiElements.push(overlay);

    // Title with pulsing animation
    titleText = add([
      text('GAME OVER', { size: 48 }),
      pos(CENTRE_X, 100),
      anchor('center'),
      z(11),
      fixed(),
      color(255, 255, 100),
    ]) as GameObj;
    uiElements.push(titleText);

    // Stats display
    statsText = add([
      text(`Depth: ${finalDepth}m\nTime: ${Math.round(runTimeMs / 1000)}s\nScore: ${score}`, {
        size: 20,
        align: 'center',
      }),
      pos(CENTRE_X, 180),
      anchor('center'),
      z(11),
      fixed(),
      color(200, 200, 200),
    ]) as GameObj;
    uiElements.push(statsText);

    // Input phase UI
    const namePrompt = add([
      text('Enter your name:', { size: 24 }),
      pos(CENTRE_X, 280),
      anchor('center'),
      z(11),
      fixed(),
      color(100, 200, 255),
    ]) as GameObj;
    uiElements.push(namePrompt);

    inputDisplay = add([
      text('_', { size: 32 }),
      pos(CENTRE_X, 330),
      anchor('center'),
      z(11),
      fixed(),
      color(255, 255, 255),
    ]) as GameObj;
    uiElements.push(inputDisplay);

    characterCounter = add([
      text('0/12', { size: 16 }),
      pos(CENTRE_X, 370),
      anchor('center'),
      z(11),
      fixed(),
      color(150, 150, 150),
    ]) as GameObj;
    uiElements.push(characterCounter);

    promptText = add([
      text('Press ENTER to submit', { size: 18 }),
      pos(CENTRE_X, height() - 100),
      anchor('center'),
      z(11),
      fixed(),
      color(255, 255, 255),
    ]) as GameObj;
    uiElements.push(promptText);

    // Handle alphanumeric input
    const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    alphanumeric.forEach((char) => {
      const handler = onKeyPress(char, () => {
        if (phase === 'input' && playerName.length < MAX_NAME_LENGTH) {
          playerName += char;
          updateInputDisplay();
        }
      });
      keyPressHandlers.push(handler);
    });

    // Handle backspace
    const backspaceHandler = onKeyPress('backspace', () => {
      if (phase === 'input' && playerName.length > 0) {
        playerName = playerName.slice(0, -1);
        updateInputDisplay();
      }
    });
    keyPressHandlers.push(backspaceHandler);

    // Handle enter - submit or restart
    const enterHandler = onKeyPress('enter', async () => {
      if (phase === 'input') {
        await submitPlayerScore(finalDepth, score, runTimeMs);
      } else if (phase === 'success' || phase === 'error') {
        onRestart();
      }
    });
    keyPressHandlers.push(enterHandler);

    // Animation loop
    updateHandler = onUpdate(() => {
      const deltaTime = dt();
      time += deltaTime;

      // Title pulsing animation
      if (titleText) {
        titleScale += titleScaleDir * deltaTime * 0.3;
        if (titleScale > 1.1) {
          titleScale = 1.1;
          titleScaleDir = -1;
        } else if (titleScale < 0.95) {
          titleScale = 0.95;
          titleScaleDir = 1;
        }
        titleText.scale = k.vec2(titleScale);
      }

      // Cursor blink in input phase
      if (phase === 'input') {
        cursorBlink += deltaTime;
        if (cursorBlink > 0.5) {
          cursorBlink = 0;
          showCursor = !showCursor;
          updateInputDisplay();
        }

        // Blink prompt text
        if (promptText) {
          const blinkSpeed = Math.floor(time * 2) % 2;
          promptText.hidden = blinkSpeed === 0;
        }
      }

      // Celebration animation for #1 rank
      if (showCelebration && phase === 'success') {
        celebrationTime += deltaTime;
        if (titleText) {
          // Rainbow color cycle
          const hue = (celebrationTime * 180) % 360;
          titleText.color = k.hsl2rgb(hue / 360, 0.8, 0.6);
          // Extra pulsing
          const celebScale = 1 + Math.sin(celebrationTime * 4) * 0.15;
          titleText.scale = k.vec2(celebScale);
        }
      }
    });

    function updateInputDisplay() {
      if (!inputDisplay || !characterCounter) return;
      
      const displayText = playerName.length > 0 
        ? playerName + (showCursor ? '|' : ' ')
        : (showCursor ? '_' : ' ');
      
      inputDisplay.text = displayText;
      characterCounter.text = `${playerName.length}/${MAX_NAME_LENGTH}`;
      
      // Color code the counter
      if (playerName.length >= MAX_NAME_LENGTH) {
        characterCounter.color = k.rgb(255, 200, 100); // Orange when at limit
      } else {
        characterCounter.color = k.rgb(150, 150, 150); // Gray otherwise
      }
    }

    async function submitPlayerScore(finalDepth: number, score: number, runTimeMs: number) {
      phase = 'submitting';

      // Clear input UI, show loading
      if (inputDisplay) destroy(inputDisplay);
      if (characterCounter) destroy(characterCounter);
      if (promptText) destroy(promptText);

      statusText = add([
        text('Submitting score...', { size: 20 }),
        pos(CENTRE_X, 330),
        anchor('center'),
        z(11),
        fixed(),
        color(255, 255, 100),
      ]) as GameObj;
      uiElements.push(statusText);

      const finalPlayerName = playerName.trim().length > 0 ? playerName.trim() : 'Anonymous';

      const payload = {
        player: finalPlayerName,
        score,
        depth: finalDepth,
        runTimeMs,
      };

      try {
        const res = await submitScore(payload);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        // Fetch leaderboard to determine rank
        try {
          const leaderboardRes = await fetch('/api/top-scores?limit=50');
          const data: LeaderboardResponse = await leaderboardRes.json();
          
          // Find player's rank
          const sortedScores = data.rows.sort((a, b) => b.score - a.score);
          const rankIndex = sortedScores.findIndex(
            (entry) => entry.player === finalPlayerName && entry.score === score
          );
          
          if (rankIndex !== -1) {
            playerRank = rankIndex + 1;
          }
        } catch {
          // Ignore leaderboard fetch errors
        }

        phase = 'success';
        showSuccess(finalPlayerName, score);
      } catch (err) {
        phase = 'error';
        showError();
        // eslint-disable-next-line no-console
        console.error('Submit score failed', err);
      }
    }

    function showSuccess(finalPlayerName: string, score: number) {
      if (statusText) destroy(statusText);

      // Check if player got #1
      if (playerRank === 1) {
        showCelebration = true;
        celebrationTime = 0;
        
        statusText = add([
          text(`🎉 NEW HIGH SCORE! 🎉\n${finalPlayerName}: ${score}m\nYou're #1!`, {
            size: 24,
            align: 'center',
          }),
          pos(CENTRE_X, 330),
          anchor('center'),
          z(11),
          fixed(),
          color(255, 215, 0), // Gold
        ]) as GameObj;
      } else if (playerRank && playerRank <= 10) {
        statusText = add([
          text(`Score submitted!\n${finalPlayerName}: ${score}m\nYou ranked #${playerRank}!`, {
            size: 22,
            align: 'center',
          }),
          pos(CENTRE_X, 330),
          anchor('center'),
          z(11),
          fixed(),
          color(100, 255, 100), // Green
        ]) as GameObj;
      } else if (playerRank) {
        statusText = add([
          text(`Score submitted!\n${finalPlayerName}: ${score}m\nYou ranked #${playerRank}`, {
            size: 20,
            align: 'center',
          }),
          pos(CENTRE_X, 330),
          anchor('center'),
          z(11),
          fixed(),
          color(100, 255, 100), // Green
        ]) as GameObj;
      } else {
        statusText = add([
          text(`Score submitted!\n${finalPlayerName}: ${score}m`, {
            size: 22,
            align: 'center',
          }),
          pos(CENTRE_X, 330),
          anchor('center'),
          z(11),
          fixed(),
          color(100, 255, 100), // Green
        ]) as GameObj;
      }
      uiElements.push(statusText);

      promptText = add([
        text('Press ENTER to return to menu', { size: 18 }),
        pos(CENTRE_X, height() - 100),
        anchor('center'),
        z(11),
        fixed(),
        color(255, 255, 255),
      ]) as GameObj;
      uiElements.push(promptText);
    }

    function showError() {
      if (statusText) destroy(statusText);

      statusText = add([
        text('Failed to submit score.\nPress ENTER to return to menu.', {
          size: 20,
          align: 'center',
        }),
        pos(CENTRE_X, 330),
        anchor('center'),
        z(11),
        fixed(),
        color(255, 100, 100), // Red
      ]) as GameObj;
      uiElements.push(statusText);
    }
  };

  const cleanup = () => {
    // Cancel all event handlers
    keyPressHandlers.forEach((handler) => handler.cancel());
    keyPressHandlers = [];
    
    if (updateHandler) {
      updateHandler.cancel();
      updateHandler = null;
    }

    // Destroy all UI elements
    uiElements.forEach((elem) => destroy(elem));
    uiElements.length = 0;
  };

  return { handleGameOver, cleanup };
}

export default gameOverController;
export type GameOverControllerReturn = ReturnType<typeof gameOverController>;
