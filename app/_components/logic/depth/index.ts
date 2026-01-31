export type DepthBand = 'early' | 'mid' | 'deep';

const EARLY_MAX = 250;
const MID_MAX = 1250;

export function getDepthBand(depth: number): DepthBand {
  switch (true) {
    case (depth < EARLY_MAX):
      return 'early';
    case (depth < MID_MAX):
      return 'mid';
    default:
      return 'deep';
  }
}

const BASE_FALL_MULT = 1;
const MID_FALL_MULT = 1.8;
const DEEP_FALL_MULT = 2.5;

export function getFallSpeedMultiplier(depth: number): number {
  const band = getDepthBand(depth);
  if (band === 'early') return BASE_FALL_MULT;
  if (band === 'mid') {
    const t = (depth - EARLY_MAX) / (MID_MAX - EARLY_MAX);
    return BASE_FALL_MULT + t * (MID_FALL_MULT - BASE_FALL_MULT);
  }
  const t = Math.min(1, (depth - MID_MAX) / 1000);
  return MID_FALL_MULT + t * (DEEP_FALL_MULT - MID_FALL_MULT);
}

const EARLY_DRAIN = 1;
const MID_DRAIN = 1.2;
const DEEP_DRAIN = 1.5;

export function getOxygenDrainMultiplier(depth: number): number {
  const band = getDepthBand(depth);
  if (band === 'early') return EARLY_DRAIN;
  if (band === 'mid') return MID_DRAIN;
  return DEEP_DRAIN;
}
