import * as tags from "@/app/_helpers/tags";
import { Sprite, sprites } from "@/app/_helpers/sprites";

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
    color?: [number, number, number];
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
    shape: 'rect',
    velocity: DEFAULT_VELOCITIES.hazards,
    sprite: sprites.spikyRock,
  },
  [tags.MINE_TAG]: {
    isStatic: false,
    shape: 'circle',
    velocity: DEFAULT_VELOCITIES.hazards,
    sprite: sprites.mine,
  },
  [tags.FISH_TAG]: {
    isStatic: false,
    shape: 'rect',
    velocity: DEFAULT_VELOCITIES.hazards,
    sprite: sprites.fish,
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
    shape: 'rect',
    velocity: DEFAULT_VELOCITIES.masks,
    sprite: sprites.mask,
  },
  [tags.JELLYFISH_TAG]: {
    isStatic: false,
    shape: 'circle',
    velocity: DEFAULT_VELOCITIES.helpers,
    sprite: sprites.jellyfish,
  },
  [tags.AIR_VENT_TAG]: {
    isStatic: false,
    shape: 'circle',
    velocity: DEFAULT_VELOCITIES.helpers,
    sprite: sprites.vent,
  },
  [tags.SHARP_ROCK_TAG]: {
    isStatic: true,
    shape: 'rect',
    velocity: DEFAULT_VELOCITIES.hazards,
    sprite: sprites.smoothRock,
  },
  [tags.OXYGEN_TANK_TAG]: {
    isStatic: false,
    shape: 'circle',
    velocity: DEFAULT_VELOCITIES.helpers,
    sprite: sprites.oxygen,
  },
};