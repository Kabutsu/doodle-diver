import * as tags from "@/app/_helpers/tags";
import { Sprite } from "@/app/_helpers/sprites";

const DEFAULT_VELOCITIES: { [key: string]: [number, number] } = {
  hazards: [7000, 17500],
  masks: [15000, 25000],
  helpers: [8000, 20000],
  walls: [8000, 12000],
};

export type ObjectTags = Exclude<typeof tags[keyof typeof tags], typeof tags.DESTROY_TAG | typeof tags.PLAYER_TAG>;

type ObjectProperties = {
  [K in ObjectTags]: {
    isStatic: boolean;
    color: [number, number, number];
    shape: 'rect' | 'circle';
    radius?: number;
    width?: number;
    height?: number;
    sprite?: Sprite;
    velocity?: [number, number];
  };
};

export const objectProperties: ObjectProperties = {
  [tags.ROCK_TAG]: {
    isStatic: true,
    color: [65, 60, 70],
    shape: 'rect',
    width: 45,
    height: 45,
    velocity: DEFAULT_VELOCITIES.hazards,
  },
  [tags.MINE_TAG]: {
    isStatic: false,
    color: [20, 20, 25],
    shape: 'circle',
    radius: 32,
    velocity: DEFAULT_VELOCITIES.hazards,
  },
  [tags.FISH_TAG]: {
    isStatic: false,
    color: [180, 160, 100],
    shape: 'rect',
    width: 24,
    height: 16,
    velocity: DEFAULT_VELOCITIES.hazards,
  },
  [tags.CURRENT_TAG]: {
    isStatic: false,
    color: [100, 150, 200],
    shape: 'rect',
    velocity: DEFAULT_VELOCITIES.hazards,
  },
  [tags.SIDE_WALL_TAG]: {
    isStatic: true,
    color: [30, 20, 60],
    shape: 'rect',
    height: 400,
    velocity: DEFAULT_VELOCITIES.walls,
  },
  [tags.MASK_PICKUP_TAG]: {
    isStatic: false,
    color: [200, 200, 255],
    shape: 'rect',
    width: 20,
    height: 20,
    velocity: DEFAULT_VELOCITIES.masks,
  },
  [tags.JELLYFISH_TAG]: {
    isStatic: false,
    color: [255, 200, 255],
    shape: 'circle',
    radius: 18,
    velocity: DEFAULT_VELOCITIES.helpers,
  },
  [tags.AIR_VENT_TAG]: {
    isStatic: false,
    color: [200, 230, 255],
    shape: 'circle',
    radius: 22,
    velocity: DEFAULT_VELOCITIES.helpers,
  },
  [tags.SHARP_ROCK_TAG]: {
    isStatic: true,
    color: [65, 60, 70],
    shape: 'rect',
    width: 24,
    height: 24,
    velocity: DEFAULT_VELOCITIES.hazards,
  },
  [tags.OXYGEN_TANK_TAG]: {
    isStatic: false,
    color: [150, 200, 255],
    shape: 'circle',
    radius: 20,
    velocity: DEFAULT_VELOCITIES.helpers,
  },
};