export type Sprite = {
  name: string;
  width: number;
  height: number;
};

type Sprites = {
  [key: string]: Sprite;
};

export const sprites: Sprites = {
  diver: {
    name: 'diver',
    width: 50,
    height: 75,
  },
} as const;
