import { GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { HealthComp } from '@/app/_components/logic/health';
import { getDepthBand } from '@/app/_components/logic/depth';
import velocity, { VelocityComp } from '@/app/_components/logic/velocity';

export const ROCK_TAG = 'rock';
export const MINE_TAG = 'mine';
export const FISH_TAG = 'fish';
export const CURRENT_TAG = 'current';
export const SIDE_WALL_TAG = 'sideWall';

const ROCK_DAMAGE = 8;
const MINE_DAMAGE = 20;
const FISH_DAMAGE = 6;
const MINE_DEBUFF_MS = 2500;
const HIGH_SPEED_THRESHOLD = 25;
const HIGH_SPEED_EXTRA = 5;

const ROCK_SIZE = 45;
const MINE_SIZE = 32;
const FISH_WIDTH = 24;
const FISH_HEIGHT = 16;
const CURRENT_STRENGTH = 80;
const MIN_GAP_RATIO = 0.4;
const WALL_HEIGHT = 400;
const MAX_TUNNELS = 2;

const WALL_SPEED_Y = 8000;

const HAZARD_MIN_SPEED_Y = 7000;
const HAZARD_MAX_SPEED_Y = 17500;

type Tunnel = { gapLeft: number; gapRight: number; topY: number; bottomY: number };

type Args = {
  k: KAPLAYCtx;
  player: GameObj<PosComp | RectComp>;
  getDepth: () => number;
  setSlowDebuffUntil: (ts: number) => void;
  setCurrentVx: (v: number) => void;
  getFallSpeed: () => number;
};

export default function hazardController({
  k,
  player,
  getDepth,
  setSlowDebuffUntil,
  setCurrentVx,
}: Args) {
  const {
    add,
    circle,
    rect,
    pos,
    color,
    opacity,
    area,
    body,
    width,
    height,
    onCollide,
    onUpdate,
    getCamPos,
    destroyAll,
    testRectPoint,
    Rect: RectClass,
  } = k;

  const spawnY = height() + 10;
  const spawnX = () => {
    return Math.random() * width();
  };

  const currentDataMap = new Map<GameObj, { strength: number; dir: number }>();
  const wallSafeXMap = new Map<GameObj, number>();
  const fishSpeedMap = new Map<GameObj, number>();
  const tunnels: Tunnel[] = [];
  let isCleanedUp = false;
  let lastSpawnTime = performance.now();
  const SPAWN_INTERVAL_MS = 2000;
  const TUNNEL_SPAWN_INTERVAL_MS = 8000;
  let lastTunnelSpawn = performance.now();

  function spawnRock() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const x = spawnX();
    add([
      rect(ROCK_SIZE, ROCK_SIZE),
      pos(x, spawnY),
      color(65, 60, 70),
      area(),
      body({ isStatic: true }),
      velocity([HAZARD_MIN_SPEED_Y, HAZARD_MAX_SPEED_Y]),
      ROCK_TAG,
    ]);
  }

  function spawnMine() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const x = spawnX();
    add([
      circle(MINE_SIZE),
      pos(x, spawnY),
      color(20, 20, 25),
      area(),
      body(),
      velocity([HAZARD_MIN_SPEED_Y, HAZARD_MAX_SPEED_Y]),
      MINE_TAG,
    ]);
  }

  function spawnFish() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const left = Math.random() < 0.5;
    const x = left ? -FISH_WIDTH - 20 : width() + 20;
    const obj = add([
      rect(FISH_WIDTH, FISH_HEIGHT),
      pos(x, spawnY),
      color(180, 160, 100),
      area(),
      body(),
      velocity([HAZARD_MIN_SPEED_Y, HAZARD_MAX_SPEED_Y]),
      FISH_TAG,
    ]) as GameObj;
    fishSpeedMap.set(obj, (left ? 1 : -1) * (120 + Math.random() * 80));
  }

  function spawnCurrent() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const w = 80 + Math.random() * 100;
    const h = 60 + Math.random() * 80;
    const x = 40 + Math.random() * (width() - 80 - w);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const obj = add([
      rect(w, h),
      pos(x, spawnY),
      color(100, 150, 200),
      opacity(0.3),
      area(),
      velocity([HAZARD_MIN_SPEED_Y, HAZARD_MAX_SPEED_Y]),
      CURRENT_TAG,
    ]) as GameObj;
    currentDataMap.set(obj, { strength: CURRENT_STRENGTH, dir });
  }

  function spawnTunnel() {
    const band = getDepthBand(getDepth());
    if (band === 'early' || tunnels.length >= MAX_TUNNELS) return;
    const camPos = getCamPos();
    const topY = camPos.y + height() / 2 + 100 + Math.random() * 200;
    const gapWidth = Math.max(width() * MIN_GAP_RATIO, width() * (0.4 + Math.random() * 0.35));
    const gapLeft = Math.random() * (width() - gapWidth);
    const gapRight = gapLeft + gapWidth;
    const leftWall = add([
      rect(gapLeft, WALL_HEIGHT),
      pos(0, topY),
      color(30, 20, 60),
      area(),
      velocity([WALL_SPEED_Y, WALL_SPEED_Y]),
      body({ isStatic: true }),
      SIDE_WALL_TAG,
    ]) as GameObj;
    wallSafeXMap.set(leftWall, gapLeft + 20);
    const rightWall = add([
      rect(width() - gapRight, WALL_HEIGHT),
      pos(gapRight, topY),
      color(30, 20, 60),
      area(),
      velocity([WALL_SPEED_Y, WALL_SPEED_Y]),
      body({ isStatic: true }),
      SIDE_WALL_TAG,
    ]) as GameObj;
    wallSafeXMap.set(rightWall, gapRight - 20);
    tunnels.push({
      gapLeft: gapLeft + 20,
      gapRight: gapRight - 20,
      topY,
      bottomY: topY + WALL_HEIGHT,
    });
  }

  onCollide(ROCK_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    h.hurt(ROCK_DAMAGE);
    b.destroy();
  });

  onCollide(MINE_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    setSlowDebuffUntil(performance.now() + MINE_DEBUFF_MS);
    h.hurt(MINE_DAMAGE);
    b.destroy();
  });

  onCollide(FISH_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    h.hurt(FISH_DAMAGE);
    b.destroy();
  });

  onUpdate(() => {
    if (isCleanedUp) return;

    const dt = k.dt();

    setCurrentVx(0);
    k.get(CURRENT_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp & RectComp>;
      const data = currentDataMap.get(obj as GameObj);
      if (!data) return;
      const r = new RectClass(o.pos, o.width ?? 80, o.height ?? 60);
      if (testRectPoint(r, player.pos)) {
        setCurrentVx(data.strength * data.dir);
      }
    });

    const now = performance.now();
    if (now - lastSpawnTime > SPAWN_INTERVAL_MS) {
      lastSpawnTime = now;
      const band = getDepthBand(getDepth());
      const r = Math.random();
      if (band === 'mid') {
        if (r < 0.4) spawnRock();
        else if (r < 0.7) spawnMine();
        else spawnFish();
      } else if (band === 'deep') {
        if (r < 0.35) spawnRock();
        else if (r < 0.6) spawnMine();
        else if (r < 0.85) spawnFish();
        else spawnCurrent();
      }
    }

    if (now - lastTunnelSpawn > TUNNEL_SPAWN_INTERVAL_MS) {
      lastTunnelSpawn = now;
      spawnTunnel();
    }

    const camTop = getCamPos().y - height() / 2 - 80;
    [ROCK_TAG, MINE_TAG, FISH_TAG, CURRENT_TAG].forEach((tag) => {
      k.get(tag).forEach((obj) => {
        const o = obj as GameObj<PosComp | VelocityComp>;
        if (o.pos.y < camTop) {
          if (tag === CURRENT_TAG) currentDataMap.delete(obj as GameObj);
          obj.destroy();
          return;
        }
        o.move(0, o.speedY * dt);
      });
    });
    k.get(FISH_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp>;
      const speed = fishSpeedMap.get(obj as GameObj) ?? 100;
      o.move(speed * dt, 0);
      if (o.pos.x < -50 || o.pos.x > width() + 50) {
        fishSpeedMap.delete(obj as GameObj);
        obj.destroy();
      }
    });

    const camBottom = getCamPos().y + height() / 2;
    for (let i = tunnels.length - 1; i >= 0; i--) {
      if (tunnels[i].topY > camBottom + 100) {
        tunnels.splice(i, 1);
      }
    }
    k.get(SIDE_WALL_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp | VelocityComp>;
      if (o.pos.y + WALL_HEIGHT < camTop) {
        wallSafeXMap.delete(obj as GameObj);
        obj.destroy();
        return;
      }
      o.move(0, o.speedY * dt);
    });
  });

  const cleanup = () => {
    isCleanedUp = true;
    currentDataMap.clear();
    wallSafeXMap.clear();
    fishSpeedMap.clear();
    tunnels.length = 0;
    destroyAll(ROCK_TAG);
    destroyAll(MINE_TAG);
    destroyAll(FISH_TAG);
    destroyAll(CURRENT_TAG);
    destroyAll(SIDE_WALL_TAG);
  };

  return { cleanup };
}

export type HazardControllerReturn = ReturnType<typeof hazardController>;
