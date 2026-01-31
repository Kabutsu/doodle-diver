import { GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { HealthComp } from '@/app/_components/logic/health';
import { getDepthBand } from '@/app/_components/logic/depth';

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

const ROCK_SIZE = 20;
const MINE_SIZE = 28;
const FISH_WIDTH = 24;
const FISH_HEIGHT = 16;
const CURRENT_STRENGTH = 80;
const MIN_GAP_RATIO = 0.4;
const WALL_HEIGHT = 400;
const MAX_TUNNELS = 2;

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
  getFallSpeed,
}: Args) {
  const {
    add,
    rect,
    pos,
    color,
    opacity,
    area,
    width,
    height,
    onCollide,
    onUpdate,
    getCamPos,
    destroyAll,
    testRectPoint,
    Rect: RectClass,
  } = k;

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
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 60 + Math.random() * 150;
    const x = 30 + Math.random() * (width() - 60);
    add([
      rect(ROCK_SIZE, ROCK_SIZE),
      pos(x, spawnY),
      color(90, 90, 100),
      area(),
      ROCK_TAG,
    ]);
  }

  function spawnMine() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 80 + Math.random() * 120;
    const x = 40 + Math.random() * (width() - 80);
    add([
      rect(MINE_SIZE, MINE_SIZE),
      pos(x, spawnY),
      color(50, 50, 55),
      area(),
      MINE_TAG,
    ]);
  }

  function spawnFish() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 50 + Math.random() * 200;
    const left = Math.random() < 0.5;
    const x = left ? -FISH_WIDTH - 20 : width() + 20;
    const obj = add([
      rect(FISH_WIDTH, FISH_HEIGHT),
      pos(x, spawnY),
      color(180, 160, 100),
      area(),
      FISH_TAG,
    ]) as GameObj;
    fishSpeedMap.set(obj, (left ? 1 : -1) * (120 + Math.random() * 80));
  }

  function spawnCurrent() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 100 + Math.random() * 180;
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
      CURRENT_TAG,
    ]) as GameObj;
    currentDataMap.set(obj, { strength: CURRENT_STRENGTH, dir });
  }

  function spawnTunnel() {
    const band = getDepthBand(getDepth());
    if (band === 'early') return;
    if (tunnels.length >= MAX_TUNNELS) return;
    const camPos = getCamPos();
    const topY = camPos.y + height() / 2 + 100 + Math.random() * 200;
    const gapWidth = Math.max(width() * MIN_GAP_RATIO, width() * (0.4 + Math.random() * 0.35));
    const gapLeft = Math.random() * (width() - gapWidth);
    const gapRight = gapLeft + gapWidth;
    const leftWall = add([
      rect(gapLeft, WALL_HEIGHT),
      pos(0, topY),
      color(40, 50, 70),
      area(),
      SIDE_WALL_TAG,
    ]) as GameObj;
    wallSafeXMap.set(leftWall, gapLeft + 20);
    const rightWall = add([
      rect(width() - gapRight, WALL_HEIGHT),
      pos(gapRight, topY),
      color(40, 50, 70),
      area(),
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
    b.destroy();
    const h = p as GameObj<HealthComp>;
    h.hurt(ROCK_DAMAGE);
    if (getFallSpeed() > HIGH_SPEED_THRESHOLD) h.hurt(HIGH_SPEED_EXTRA);
  });

  onCollide(MINE_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    h.hurt(MINE_DAMAGE);
    if (getFallSpeed() > HIGH_SPEED_THRESHOLD) h.hurt(HIGH_SPEED_EXTRA);
    setSlowDebuffUntil(performance.now() + MINE_DEBUFF_MS);
    b.destroy();
  });

  onCollide(FISH_TAG, PLAYER_TAG, (b, p) => {
    b.destroy();
    const h = p as GameObj<HealthComp>;
    h.hurt(FISH_DAMAGE);
    if (getFallSpeed() > HIGH_SPEED_THRESHOLD) h.hurt(HIGH_SPEED_EXTRA);
  });

  onCollide(SIDE_WALL_TAG, PLAYER_TAG, (_wall, p) => {
    const safeX = wallSafeXMap.get(_wall as GameObj) ?? width() / 2;
    (p as GameObj<PosComp>).pos.x = safeX;
  });

  onUpdate(() => {
    if (isCleanedUp) return;

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
        const o = obj as GameObj<PosComp>;
        if (o.pos.y < camTop) {
          if (tag === CURRENT_TAG) currentDataMap.delete(obj as GameObj);
          obj.destroy();
        }
      });
    });
    k.get(FISH_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp>;
      const speed = fishSpeedMap.get(obj as GameObj) ?? 100;
      o.move(speed * k.dt(), 0);
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
      const o = obj as GameObj<PosComp>;
      if (o.pos.y > camBottom + 50) {
        wallSafeXMap.delete(obj as GameObj);
        obj.destroy();
      }
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
