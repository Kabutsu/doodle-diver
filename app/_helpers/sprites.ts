export type Sprite = {
  name: string;
  width: number;
  height: number;
  anim?: string;
  animation?: {
    sliceX: number;
    sliceY: number;
    anims: {
      [key: string]: {
        from: number;
        to: number;
        loop?: boolean;
      };
    };
  }
};

type Sprites = {
  [key: string]: Sprite;
};

export const sprites: Sprites = {
  diver: {
    name: 'diver-2',
    width: 75,
    height: 57,
  },
  oxygen: {
    name: 'oxygen',
    width: 40,
    height: 45,
  },
  bubble: {
    name: 'bubble',
    width: 30,
    height: 31,
  },
  mask: {
    name: 'mask',
    width: 48,
    height: 45,
  },
  mine: {
    name: 'mine',
    width: 42,
    height: 42,
  },
  smoothRock: {
    name: 'rock-smooth',
    width: 49,
    height: 33,
  },
  spikyRock: {
    name: 'rock-spiky',
    width: 53,
    height: 43,
  },
  fish: {
    name: 'shark',
    width: 72,
    height: 40,
  },
  vent: {
    name: 'vent',
    width: 60,
    height: 60,
  },
  jellyfish: {
    name: 'jellyfish',
    width: 39,
    height: 70,
    anim: 'swim',
    animation: {
      sliceX: 2,
      sliceY: 2,
      anims: {
        swim: { from: 0, to: 3, loop: true },
      },
    },
  }
} as const;
