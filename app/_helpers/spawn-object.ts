import { Comp, KAPLAYCtx } from "kaplay";

import velocity from "@/app/_components/logic/velocity";

import { objectProperties, ObjectTags } from "@/app/_helpers/object-properties";

type Args = {
  k: KAPLAYCtx;
  tag: ObjectTags;
  xSpawnPos?: number | null;
};

export default function spawnObject({
  k,
  tag,
  xSpawnPos = null,
}: Args) {
  const {
    add,
    pos,
    color,
    area,
    body,
    circle,
    rect,
    sprite,
    width,
    height,
  } = k;

  const x = xSpawnPos ?? Math.random() * width();
  const y = height() + 10;

  const props = objectProperties[tag];

  const components: Array<Comp | string> = [];

  // Position first
  components.push(pos(x, y));

  // Shape or sprite
  if (props?.sprite) {
    components.push(sprite(props.sprite.name, {
      width: props.sprite.width,
      height: props.sprite.height,
    }));
  } else if (props?.shape === 'circle') {
    components.push(circle(props.radius ?? 16));
    components.push(color(...(props?.color ?? [150, 150, 150])));
  } else {
    components.push(rect(props?.width ?? 30, props?.height ?? 30));
    components.push(color(...(props?.color ?? [150, 150, 150])));
  }

  // Collision + physics
  components.push(area());
  components.push(body({ isStatic: props?.isStatic ?? false }));

  // Velocity
  if (props?.velocity) {
    components.push(velocity(props.velocity));
  }

  // Tag
  components.push(tag);

  add(components);
}
