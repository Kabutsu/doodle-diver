import { GameObj, KAPLAYCtx } from "kaplay";
import spawnObject from "@/app/_helpers/spawn-object";
import velocity from "@/app/_components/logic/velocity";
import {
  getSpawnConfig,
  getObjectTypeRatios,
  selectWeightedObjectType,
  getRandomXPos,
  getSpawnYPos,
  type ObjectCategory,
} from "@/app/_helpers/spawn-manager";
import * as tags from "@/app/_helpers/tags";
import { sprites } from "@/app/_helpers/sprites";
import { type MaskType } from "@/app/_components/logic/mask/types";
import { DEFAULT_VELOCITIES } from "@/app/_helpers/object-properties";

const SPAWN_LOOP_INTERVAL_MS = 1500; // Unified spawn check every 1.5 seconds

type TunnelMetadata = {
  gapLeft: number;
  gapRight: number;
  topY: number;
  bottomY: number;
};

type CurrentMetadata = {
  strength: number;
  dir: number;
};

type FishMetadata = {
  speedX: number;
};

type Args = {
  k: KAPLAYCtx;
  getDepth: () => number;
};

export default function gameDirector({ k, getDepth }: Args) {
  const { width, height, onUpdate, destroyAll, getCamPos, loadSprite } = k;

  Object.values(sprites).forEach((sprite) => {
    loadSprite(sprite.name, `/${sprite.name}.png`, sprite.animation ?? {});
  });

  // Track last spawn times per category
  const lastSpawnTimes: Record<ObjectCategory, number> = {
    oxygenTank: 0,
    helper: 0,
    hazard: 0,
    mask: 0,
    tunnel: 0,
  };

  // Metadata maps for special objects (director manages spawn data)
  const currentMetadataMap = new Map<GameObj, CurrentMetadata>();
  const fishMetadataMap = new Map<GameObj, FishMetadata>();
  const tunnelMetadata: TunnelMetadata[] = [];
  const maskTypeMap = new Map<GameObj, MaskType>();

  let isCleanedUp = false;
  let lastSpawnLoopTime = performance.now();

  /**
   * Main spawn loop - checks all categories for eligibility
   */
  function spawnLoop() {
    if (isCleanedUp) return;

    const now = performance.now();
    const depth = getDepth();

    // Check each category
    const categories: ObjectCategory[] = ['oxygenTank', 'helper', 'hazard', 'mask', 'tunnel'];

    for (const category of categories) {
      const config = getSpawnConfig(category, depth);
      
      if (!config.enabled) continue;

      // Check cooldown
      if (now - lastSpawnTimes[category] < config.cooldownMs) continue;

      // Check concurrent limit
      const currentCount = getCategoryCount(category);
      if (currentCount >= config.maxConcurrent) continue;

      // Roll for spawn chance
      if (Math.random() > config.spawnChance) continue;

      // Spawn object for this category
      spawnForCategory(category, depth);
      lastSpawnTimes[category] = now;
    }
  }

  /**
   * Get count of active objects in a category
   */
  function getCategoryCount(category: ObjectCategory): number {
    switch (category) {
      case 'oxygenTank':
        return k.get(tags.OXYGEN_TANK_TAG).length;
      case 'helper':
        return (
          k.get(tags.JELLYFISH_TAG).length +
          k.get(tags.AIR_VENT_TAG).length +
          k.get(tags.SHARP_ROCK_TAG).length
        );
      case 'hazard':
        return (
          k.get(tags.ROCK_TAG).length +
          k.get(tags.MINE_TAG).length +
          k.get(tags.FISH_TAG).length +
          k.get(tags.CURRENT_TAG).length
        );
      case 'mask':
        return k.get(tags.MASK_PICKUP_TAG).length;
      case 'tunnel':
        return tunnelMetadata.length;
      default:
        return 0;
    }
  }

  /**
   * Spawn object for a specific category
   */
  function spawnForCategory(category: ObjectCategory, depth: number) {
    const spawnY = getSpawnYPos(height());

    switch (category) {
      case 'oxygenTank':
        spawnObject({
          k,
          tag: tags.OXYGEN_TANK_TAG,
          xSpawnPos: getRandomXPos(width()),
        });
        break;

      case 'helper':
        {
          const ratios = getObjectTypeRatios('helper', depth);
          const type = selectWeightedObjectType(ratios);
          spawnObject({
            k,
            tag: type as typeof tags.JELLYFISH_TAG | typeof tags.AIR_VENT_TAG | typeof tags.SHARP_ROCK_TAG,
            xSpawnPos: getRandomXPos(width()),
          });
        }
        break;

      case 'hazard':
        {
          const ratios = getObjectTypeRatios('hazard', depth);
          const type = selectWeightedObjectType(ratios);
          
          if (type === tags.FISH_TAG) {
            spawnFish(spawnY);
          } else if (type === tags.CURRENT_TAG) {
            spawnCurrent(spawnY);
          } else {
            spawnObject({
              k,
              tag: type as typeof tags.ROCK_TAG | typeof tags.MINE_TAG,
              xSpawnPos: getRandomXPos(width()),
            });
          }
        }
        break;

      case 'mask':
        spawnMask();
        break;

      case 'tunnel':
        spawnTunnel();
        break;
    }
  }

  /**
   * Spawn fish with horizontal movement
   */
  function spawnFish(spawnY: number) {
    const left = Math.random() < 0.5;
    const x = left ? -24 - 20 : width() + 20;
    const speedX = (left ? 1 : -1) * (120 + Math.random() * 80);

    const obj = k.add([
      k.rect(24, 16),
      k.pos(x, spawnY),
      k.color(180, 160, 100),
      k.area(),
      k.body(),
      velocity([7000, 17500]),
      tags.FISH_TAG,
    ]) as GameObj;

    fishMetadataMap.set(obj, { speedX });
  }

  /**
   * Spawn current with direction metadata
   */
  function spawnCurrent(spawnY: number) {
    const w = 80 + Math.random() * 100;
    const h = 60 + Math.random() * 80;
    const x = 40 + Math.random() * (width() - 80 - w);
    const dir = Math.random() < 0.5 ? 1 : -1;

    const obj = k.add([
      k.rect(w, h),
      k.pos(x, spawnY),
      k.color(100, 150, 200),
      k.opacity(0.3),
      k.area(),
      velocity([7000, 17500]),
      tags.CURRENT_TAG,
    ]) as GameObj;

    currentMetadataMap.set(obj, { strength: 80, dir });
  }

  /**
   * Spawn mask pickup with random type
   */
  function spawnMask() {
    const camPos = getCamPos();
    const spawnY = camPos.y + height() / 2 + 60 + Math.random() * 100;
    const x = getRandomXPos(width());
    
    const maskTypes: MaskType[] = ['pressure', 'rebreather', 'blind'];
    const type = maskTypes[Math.floor(Math.random() * maskTypes.length)];

    const MASK_COLORS: Record<MaskType, [number, number, number]> = {
      pressure: [255, 100, 100],
      rebreather: [100, 255, 100],
      blind: [200, 200, 255],
    };

    const obj = spawnObject({
      k,
      tag: tags.MASK_PICKUP_TAG,
      xSpawnPos: x,
    });

    // const obj = k.add([
    //   k.rect(20, 20),
    //   k.pos(x, spawnY),
    //   k.color(...MASK_COLORS[type]),
    //   k.area(),
    //   velocity([15000, 25000]),
    //   k.body(),
    //   tags.MASK_PICKUP_TAG,
    // ]) as GameObj;

    maskTypeMap.set(obj, type);
  }

  /**
   * Spawn tunnel with side walls
   */
  function spawnTunnel() {
    const camPos = getCamPos();
    const topY = camPos.y + height() / 2 + 100 + Math.random() * 200;
    const gapWidth = Math.max(width() * 0.4, width() * (0.4 + Math.random() * 0.35));
    const gapLeft = Math.random() * (width() - gapWidth);
    const gapRight = gapLeft + gapWidth;
    const WALL_HEIGHT = 400;

    const container = k.add([
      k.rect(width(), WALL_HEIGHT),
      k.pos(0, topY),
      k.opacity(0),
      velocity(DEFAULT_VELOCITIES.walls),
      tags.SIDE_WALL_TAG,
    ]);

    // Left wall
    container.add([
      k.rect(gapLeft, WALL_HEIGHT),
      k.pos(0, 0),
      k.color(30, 20, 60),
      k.area(),
      k.body({ isStatic: true }),
    ]);

    // Right wall
    container.add([
      k.rect(width() - gapRight, WALL_HEIGHT),
      k.pos(gapRight, 0),
      k.color(30, 20, 60),
      k.area(),
      k.body({ isStatic: true }),
    ]);

    tunnelMetadata.push({
      gapLeft: gapLeft + 20,
      gapRight: gapRight - 20,
      topY,
      bottomY: topY + WALL_HEIGHT,
    });
  }

  /**
   * Cleanup metadata for destroyed objects
   */
  function cleanupMetadata() {
    // Clean up fish metadata for destroyed fish
    const activeFish = k.get(tags.FISH_TAG);
    const fishSet = new Set(activeFish);
    for (const [obj] of fishMetadataMap) {
      if (!fishSet.has(obj)) {
        fishMetadataMap.delete(obj);
      }
    }

    // Clean up current metadata
    const activeCurrents = k.get(tags.CURRENT_TAG);
    const currentSet = new Set(activeCurrents);
    for (const [obj] of currentMetadataMap) {
      if (!currentSet.has(obj)) {
        currentMetadataMap.delete(obj);
      }
    }

    // Clean up mask metadata
    const activeMasks = k.get(tags.MASK_PICKUP_TAG);
    const maskSet = new Set(activeMasks);
    for (const [obj] of maskTypeMap) {
      if (!maskSet.has(obj)) {
        maskTypeMap.delete(obj);
      }
    }

    // Clean up tunnel metadata (remove tunnels that are off-screen)
    const camBottom = getCamPos().y + height() / 2;
    for (let i = tunnelMetadata.length - 1; i >= 0; i--) {
      if (tunnelMetadata[i].topY > camBottom + 100) {
        tunnelMetadata.splice(i, 1);
      }
    }
  }

  // Main update loop
  onUpdate(() => {
    if (isCleanedUp) return;

    const now = performance.now();

    // Run spawn loop
    if (now - lastSpawnLoopTime >= SPAWN_LOOP_INTERVAL_MS) {
      lastSpawnLoopTime = now;
      spawnLoop();
    }

    // Cleanup metadata for destroyed objects
    cleanupMetadata();
  });

  // Cleanup function
  const cleanup = () => {
    isCleanedUp = true;
    currentMetadataMap.clear();
    fishMetadataMap.clear();
    tunnelMetadata.length = 0;
    maskTypeMap.clear();
    
    // Destroy all managed objects
    destroyAll(tags.OXYGEN_TANK_TAG);
    destroyAll(tags.JELLYFISH_TAG);
    destroyAll(tags.AIR_VENT_TAG);
    destroyAll(tags.SHARP_ROCK_TAG);
    destroyAll(tags.ROCK_TAG);
    destroyAll(tags.MINE_TAG);
    destroyAll(tags.FISH_TAG);
    destroyAll(tags.CURRENT_TAG);
    destroyAll(tags.MASK_PICKUP_TAG);
    destroyAll(tags.SIDE_WALL_TAG);
  };

  // Public API for accessing metadata (needed by effect controllers)
  const getCurrentMetadata = (obj: GameObj): CurrentMetadata | undefined => currentMetadataMap.get(obj);
  const getFishMetadata = (obj: GameObj): FishMetadata | undefined => fishMetadataMap.get(obj);
  const getTunnelMetadata = (): TunnelMetadata[] => tunnelMetadata;
  const getMaskType = (obj: GameObj): MaskType | undefined => maskTypeMap.get(obj);

  return {
    cleanup,
    getCurrentMetadata,
    getFishMetadata,
    getTunnelMetadata,
    getMaskType,
  };
}

export type GameDirectorReturn = ReturnType<typeof gameDirector>;