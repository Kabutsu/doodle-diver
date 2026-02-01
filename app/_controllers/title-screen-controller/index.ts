import { GameObj, KAPLAYCtx } from 'kaplay';
import { sprites } from '@/app/_helpers/sprites';

type HighScore = {
  player: string;
  depth: number;
};

type Args = {
  k: KAPLAYCtx;
  isMobile?: boolean;
  onStart: () => void;
};

function titleScreenController({ k, isMobile = false, onStart }: Args) {
  const { add, text, pos, rect, color, opacity, z, fixed, onUpdate, destroy, width, height, anchor, onKeyPress, sprite, loadSprite, dt, area } = k;

  // Load player sprite
  loadSprite(sprites.diver.name, `/${sprites.diver.name}.png`);

  const CENTRE_X = width() / 2;
  const PLAYER_MIN_POS = 0.1;
  const PLAYER_START_Y = height() * PLAYER_MIN_POS;

  // Semi-transparent overlay for better text readability
  const overlay = add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.4),
    z(10),
    fixed(),
  ]) as GameObj;

  // Title with animation
  const title = add([
    text('DOODLE DIVER', { size: 48 }),
    pos(CENTRE_X, 80),
    anchor('center'),
    z(11),
    fixed(),
    color(255, 255, 100),
  ]) as GameObj;

  // Player sprite with bobbing animation
  const playerSprite = add([
    pos(CENTRE_X, PLAYER_START_Y),
    sprite(sprites.diver.name, { width: sprites.diver.width, height: sprites.diver.height }),
    anchor('center'),
    z(11),
    fixed(),
  ]) as GameObj;

  // Controls section
  const controlsTitle = add([
    text('CONTROLS', { size: 24 }),
    pos(CENTRE_X, 200),
    anchor('center'),
    z(11),
    fixed(),
    color(100, 200, 255),
  ]) as GameObj;

  const controls = isMobile ? [
    'Tap & Hold: Move left/right',
    'Double-Tap Side: Boost (2.5x speed, 1s)',
    'Tap Lower Corners: Diagonal kick',
    'Tap Lower Center: Down kick',
    'Kicking & boosting consume oxygen!',
  ] : [
    'Arrow Keys: Move',
    'Space: Boost (2.5x speed, 1s)',
    'Up/Down (press): Kick vertically',
    'Kicking & boosting consume oxygen!',
  ];

  const controlTexts = controls.map((ctrl, i) => {
    return add([
      text(ctrl, { size: isMobile ? 14 : 16 }),
      pos(CENTRE_X, 240 + i * (isMobile ? 28 : 30)),
      anchor('center'),
      z(11),
      fixed(),
      color(200, 200, 200),
    ]) as GameObj;
  });

  // Game tips section
  const tipsTitle = add([
    text('SURVIVE THE DEPTHS!', { size: 24 }),
    pos(CENTRE_X, 360),
    anchor('center'),
    z(11),
    fixed(),
    color(100, 255, 100),
  ]) as GameObj;

  const tips = [
    'Collect oxygen tanks to stay alive',
    'Pick up masks for special effects',
    'Avoid rocks, mines, and jellyfish',
    'Bounce off swirling vortexes',
    'Watch your oxygen level!',
  ];

  const tipTexts = tips.map((tip, i) => {
    return add([
      text(tip, { size: 14 }),
      pos(CENTRE_X, 400 + i * 25),
      anchor('center'),
      z(11),
      fixed(),
      color(180, 180, 180),
    ]) as GameObj;
  });

  // High scores section
  const scoresTitle = add([
    text('TOP DIVERS', { size: 24 }),
    pos(CENTRE_X, 550),
    anchor('center'),
    z(11),
    fixed(),
    color(255, 200, 100),
  ]) as GameObj;

  const scoreTexts: GameObj[] = [
    add([
      text('Loading...', { size: 16 }),
      pos(CENTRE_X, 590),
      anchor('center'),
      z(11),
      fixed(),
      color(200, 200, 200),
    ]) as GameObj,
  ];

  // Start prompt with blinking animation (or button for mobile)
  let startPrompt: GameObj;
  let startButton: GameObj | null = null;
  
  if (isMobile) {
    // Create a button for mobile
    startButton = add([
      rect(280, 60, { radius: 8 }),
      pos(CENTRE_X, height() - 70),
      anchor('center'),
      z(11),
      fixed(),
      color(100, 200, 100),
      area(),
      'startButton',
    ]) as GameObj;
    
    startPrompt = add([
      text('TAP TO START', { size: 24 }),
      pos(CENTRE_X, height() - 70),
      anchor('center'),
      z(12),
      fixed(),
      color(255, 255, 255),
    ]) as GameObj;
    
    // Add click handler for mobile button
    startButton.onClick(() => {
      onStart();
    });
  } else {
    startPrompt = add([
      text('PRESS SPACE TO START', { size: 20 }),
      pos(CENTRE_X, height() - 60),
      anchor('center'),
      z(11),
      fixed(),
      color(255, 255, 255),
    ]) as GameObj;
  }

  // Fetch high scores
  fetch('/api/top-scores?limit=3')
    .then(res => res.json())
    .then((data: { rows: HighScore[] }) => {
      // Clear loading text
      scoreTexts.forEach(st => destroy(st));
      scoreTexts.length = 0;

      const topScores = data.rows.slice(0, 3);
      if (topScores.length === 0) {
        scoreTexts.push(
          add([
            text('No scores yet - be the first!', { size: 16 }),
            pos(CENTRE_X, 590),
            anchor('center'),
            z(11),
            fixed(),
            color(200, 200, 200),
          ]) as GameObj
        );
      } else {
        topScores.forEach((score, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
          scoreTexts.push(
            add([
              text(`${medal} ${score.player}: ${Math.floor(score.depth)}m`, { size: 16 }),
              pos(CENTRE_X, 590 + i * 30),
              anchor('center'),
              z(11),
              fixed(),
              color(200, 200, 200),
            ]) as GameObj
          );
        });
      }
    })
    .catch(() => {
      // Clear loading text and show error
      scoreTexts.forEach(st => destroy(st));
      scoreTexts.length = 0;
      scoreTexts.push(
        add([
          text('Scores unavailable', { size: 16 }),
          pos(CENTRE_X, 590),
          anchor('center'),
          z(11),
          fixed(),
          color(200, 100, 100),
        ]) as GameObj
      );
    });

  // Animation state
  let time = 0;
  let titleScale = 1;
  let titleScaleDir = 1;
  let blinkTimer = 0;
  let playerBobOffset = 0;

  // Key press listener (desktop only)
  const keyPressEvent = isMobile ? null : onKeyPress('space', () => {
    onStart();
  });

  // Update animations
  const updateEvent = onUpdate(() => {
    const deltaTime = dt();
    time += deltaTime;

    // Title pulsing animation
    titleScale += titleScaleDir * deltaTime * 0.3;
    if (titleScale > 1.1) {
      titleScale = 1.1;
      titleScaleDir = -1;
    } else if (titleScale < 0.95) {
      titleScale = 0.95;
      titleScaleDir = 1;
    }
    title.scale = k.vec2(titleScale);

    // Player bobbing animation
    playerBobOffset = Math.sin(time * 2) * 15;
    playerSprite.pos.y = PLAYER_START_Y + playerBobOffset;

    // Blinking start prompt (desktop) or pulsing button (mobile)
    blinkTimer += deltaTime;
    if (blinkTimer > 0.5) {
      blinkTimer = 0;
      if (!isMobile) {
        startPrompt.hidden = !startPrompt.hidden;
      }
    }
    
    // Pulsing button effect for mobile
    if (isMobile && startButton) {
      const pulseScale = 1 + Math.sin(time * 3) * 0.05;
      startButton.scale = k.vec2(pulseScale);
    }

    // Subtle color shift on controls title
    const hue = (time * 30) % 60 + 180; // Cycle through blue-cyan range
    controlsTitle.color = k.hsl2rgb(hue / 360, 0.7, 0.6);
  });

  const cleanup = () => {
    // Cancel event handlers
    if (keyPressEvent) keyPressEvent.cancel();
    updateEvent.cancel();

    // Destroy all UI elements
    destroy(overlay);
    destroy(title);
    destroy(playerSprite);
    destroy(controlsTitle);
    controlTexts.forEach(ct => destroy(ct));
    destroy(tipsTitle);
    tipTexts.forEach(tt => destroy(tt));
    destroy(scoresTitle);
    scoreTexts.forEach(st => destroy(st));
    destroy(startPrompt);
    if (startButton) destroy(startButton);
  };

  return { cleanup };
}

export default titleScreenController;
export type TitleScreenControllerReturn = ReturnType<typeof titleScreenController>;
