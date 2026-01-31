import { getDepthBand, type DepthBand } from "@/app/_components/logic/depth";
import * as tags from "@/app/_helpers/tags";

// Depth band thresholds (matches depth/index.ts)
export const EARLY_MAX_DEPTH = 250;
export const MID_MAX_DEPTH = 1250;

// Object type categories
export type HazardType = 
  | typeof tags.ROCK_TAG 
  | typeof tags.MINE_TAG 
  | typeof tags.FISH_TAG 
  | typeof tags.CURRENT_TAG;

export type HelperType = 
  | typeof tags.JELLYFISH_TAG 
  | typeof tags.AIR_VENT_TAG 
  | typeof tags.SHARP_ROCK_TAG;

export type ObjectCategory = 'oxygenTank' | 'helper' | 'hazard' | 'mask' | 'tunnel';

// Spawn configuration for each object category
export interface SpawnConfig {
  enabled: boolean;
  spawnChance: number; // 0-1, probability that category spawns on eligible tick
  maxConcurrent: number; // Max objects of this category on screen
  cooldownMs: number; // Min ms between spawns of this category
}

// Configuration for specific object types within categories
export interface ObjectTypeRatio {
  type: string;
  weight: number;
}

/**
 * Get spawn configuration for a category based on depth
 */
export function getSpawnConfig(category: ObjectCategory, depth: number): SpawnConfig {
  const band = getDepthBand(depth);

  switch (category) {
    case 'oxygenTank':
      return getOxygenTankConfig(band);
    case 'helper':
      return getHelperConfig(band);
    case 'hazard':
      return getHazardConfig(band);
    case 'mask':
      return getMaskConfig(band);
    case 'tunnel':
      return getTunnelConfig(band);
  }
}

function getOxygenTankConfig(band: DepthBand): SpawnConfig {
  switch (band) {
    case 'early':
      return {
        enabled: true,
        spawnChance: 0.9, // Very frequent in early game
        maxConcurrent: 3,
        cooldownMs: 1500,
      };
    case 'mid':
      return {
        enabled: true,
        spawnChance: 0.6, // Less frequent in mid game
        maxConcurrent: 2,
        cooldownMs: 2500,
      };
    case 'deep':
      return {
        enabled: true,
        spawnChance: 0.3, // Rare in deep game
        maxConcurrent: 1,
        cooldownMs: 4000,
      };
  }
}

function getHelperConfig(band: DepthBand): SpawnConfig {
  switch (band) {
    case 'early':
      return {
        enabled: true,
        spawnChance: 0.5, // Moderate in early game
        maxConcurrent: 2,
        cooldownMs: 2500,
      };
    case 'mid':
      return {
        enabled: true,
        spawnChance: 0.8, // Peak in mid game
        maxConcurrent: 3,
        cooldownMs: 2000,
      };
    case 'deep':
      return {
        enabled: true,
        spawnChance: 0.4, // Reduced in deep game
        maxConcurrent: 2,
        cooldownMs: 3000,
      };
  }
}

function getHazardConfig(band: DepthBand): SpawnConfig {
  switch (band) {
    case 'early':
      return {
        enabled: false, // No hazards in early game
        spawnChance: 0,
        maxConcurrent: 0,
        cooldownMs: 0,
      };
    case 'mid':
      return {
        enabled: true,
        spawnChance: 0.7, // Moderate hazards
        maxConcurrent: 3,
        cooldownMs: 2000,
      };
    case 'deep':
      return {
        enabled: true,
        spawnChance: 0.95, // Very frequent hazards
        maxConcurrent: 5,
        cooldownMs: 1500,
      };
  }
}

function getMaskConfig(band: DepthBand): SpawnConfig {
  switch (band) {
    case 'early':
      return {
        enabled: false, // No masks in early game
        spawnChance: 0,
        maxConcurrent: 0,
        cooldownMs: 0,
      };
    case 'mid':
      return {
        enabled: true,
        spawnChance: 0.5, // Peak availability
        maxConcurrent: 1,
        cooldownMs: 12000,
      };
    case 'deep':
      return {
        enabled: true,
        spawnChance: 0.3, // Rarer in deep
        maxConcurrent: 1,
        cooldownMs: 15000,
      };
  }
}

function getTunnelConfig(band: DepthBand): SpawnConfig {
  switch (band) {
    case 'early':
      return {
        enabled: false,
        spawnChance: 0,
        maxConcurrent: 0,
        cooldownMs: 0,
      };
    case 'mid':
      return {
        enabled: true,
        spawnChance: 0.6,
        maxConcurrent: 1,
        cooldownMs: 8000,
      };
    case 'deep':
      return {
        enabled: true,
        spawnChance: 0.8,
        maxConcurrent: 2,
        cooldownMs: 6000,
      };
  }
}

/**
 * Get weighted object type ratios for a category at given depth
 */
export function getObjectTypeRatios(category: ObjectCategory, depth: number): ObjectTypeRatio[] {
  const band = getDepthBand(depth);

  switch (category) {
    case 'helper':
      return getHelperRatios(band);
    case 'hazard':
      return getHazardRatios(band);
    default:
      return [];
  }
}

function getHelperRatios(band: DepthBand): ObjectTypeRatio[] {
  switch (band) {
    case 'early':
      return [
        { type: tags.JELLYFISH_TAG, weight: 0.6 }, // 60% jellyfish
        { type: tags.AIR_VENT_TAG, weight: 0.4 },  // 40% air vents
      ];
    case 'mid':
      return [
        { type: tags.JELLYFISH_TAG, weight: 0.4 },   // 40% jellyfish
        { type: tags.AIR_VENT_TAG, weight: 0.35 },   // 35% air vents
        { type: tags.SHARP_ROCK_TAG, weight: 0.25 }, // 25% sharp rocks
      ];
    case 'deep':
      return [
        { type: tags.JELLYFISH_TAG, weight: 0.35 },  // 35% jellyfish
        { type: tags.AIR_VENT_TAG, weight: 0.25 },   // 25% air vents
        { type: tags.SHARP_ROCK_TAG, weight: 0.4 },  // 40% sharp rocks
      ];
  }
}

function getHazardRatios(band: DepthBand): ObjectTypeRatio[] {
  switch (band) {
    case 'early':
      return []; // No hazards in early
    case 'mid':
      return [
        { type: tags.ROCK_TAG, weight: 0.4 }, // 40% rocks
        { type: tags.MINE_TAG, weight: 0.3 }, // 30% mines
        { type: tags.FISH_TAG, weight: 0.3 }, // 30% fish
      ];
    case 'deep':
      return [
        { type: tags.ROCK_TAG, weight: 0.35 },   // 35% rocks
        { type: tags.MINE_TAG, weight: 0.25 },   // 25% mines
        { type: tags.FISH_TAG, weight: 0.25 },   // 25% fish
        { type: tags.CURRENT_TAG, weight: 0.15 }, // 15% currents
      ];
  }
}

/**
 * Select a random object type based on weighted ratios
 */
export function selectWeightedObjectType(ratios: ObjectTypeRatio[]): string {
  const totalWeight = ratios.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const ratio of ratios) {
    roll -= ratio.weight;
    if (roll <= 0) {
      return ratio.type;
    }
  }
  
  // Fallback to first type
  return ratios[0]?.type ?? '';
}

/**
 * Get random X position within screen bounds with optional padding
 */
export function getRandomXPos(screenWidth: number, padding: number = 30): number {
  return padding + Math.random() * (screenWidth - padding * 2);
}

/**
 * Get random Y position below screen (for spawning)
 */
export function getSpawnYPos(screenHeight: number, offset: number = 10): number {
  return screenHeight + offset;
}
