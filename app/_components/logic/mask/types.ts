export type MaskType = 'pressure' | 'rebreather' | 'blind';

export interface MaskDef {
  durationMin: number;
  durationMax: number;
  fallSpeedMult: number;
  oxygenDrainMult: number;
  bounceDecayMult: number;
  pauseOxygenDrain: boolean;
}

export const MASK_DEFS: Record<MaskType, MaskDef> = {
  pressure: {
    durationMin: 5,
    durationMax: 10,
    fallSpeedMult: 2.1,
    oxygenDrainMult: 2,
    bounceDecayMult: 0.7,
    pauseOxygenDrain: false,
  },
  rebreather: {
    durationMin: 6,
    durationMax: 12,
    fallSpeedMult: 0.5,
    oxygenDrainMult: 0.5,
    bounceDecayMult: 1,
    pauseOxygenDrain: false,
  },
  blind: {
    durationMin: 8,
    durationMax: 12,
    fallSpeedMult: 1.3,
    oxygenDrainMult: 1,
    bounceDecayMult: 1,
    pauseOxygenDrain: true,
  },
};

export function getMaskDuration(type: MaskType): number {
  const def = MASK_DEFS[type];
  const range = def.durationMax - def.durationMin;
  return def.durationMin + Math.random() * range;
}
