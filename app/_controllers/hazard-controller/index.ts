import { GameObj, KAPLAYCtx, PosComp, RectComp } from 'kaplay';
import { PLAYER_TAG } from '../player-controller';
import { HealthComp } from '@/app/_components/logic/health';
import { VelocityComp } from '@/app/_components/logic/velocity';
import { type GameDirectorReturn } from '../game-director';
import * as tags from '@/app/_helpers/tags';

export const ROCK_TAG = tags.ROCK_TAG;
export const MINE_TAG = tags.MINE_TAG;
export const FISH_TAG = tags.FISH_TAG;
export const CURRENT_TAG = tags.CURRENT_TAG;
export const SIDE_WALL_TAG = tags.SIDE_WALL_TAG;

const ROCK_DAMAGE = 8;
const MINE_DAMAGE = 20;
const FISH_DAMAGE = 6;
const MINE_DEBUFF_MS = 2500;

const DESTROY = 'hazard_DESTROY';

type Args = {
  k: KAPLAYCtx;
  player: GameObj<PosComp | RectComp>;
  setSlowDebuffUntil: (ts: number) => void;
  setCurrentVx: (v: number) => void;
  getFallSpeed: () => number;
  gameDirector: GameDirectorReturn;
};

export default function hazardController({
  k,
  player,
  setSlowDebuffUntil,
  setCurrentVx,
  getFallSpeed,
  gameDirector,
}: Args) {
  const {
    onCollide,
    onUpdate,
    getCamPos,
    height,
    width,
    testRectPoint,
    Rect: RectClass,
    destroyAll,
  } = k;

  let isCleanedUp = false;
  let updateEvent: { cancel: () => void } | null = null;

  // Collision handlers
  onCollide(ROCK_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    h.hurt(ROCK_DAMAGE);
    k.shake(5);
    k.play('hazard-thud', { volume: 0.6 });
    b.destroy();
  });

  onCollide(MINE_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    setSlowDebuffUntil(performance.now() + MINE_DEBUFF_MS);
    h.hurt(MINE_DAMAGE);
    k.shake(10);
    k.play('mine-explosion', { volume: 0.8 });
    b.destroy();
  });

  onCollide(FISH_TAG, PLAYER_TAG, (b, p) => {
    const h = p as GameObj<HealthComp>;
    h.hurt(FISH_DAMAGE);
    k.shake(4);
    k.play('hazard-thud', { volume: 0.6 });
    b.destroy();
  });

  // Update loop - handle movement and current effects
  updateEvent = onUpdate(() => {
    if (isCleanedUp) return;

    const dt = k.dt();
    const camTop = getCamPos().y - height() / 2 - 80;
    const fallSpeed = getFallSpeed();
    const baseSpeed = 1500;
    const speedMultiplier = fallSpeed / baseSpeed;

    // Handle currents - check if player is inside and apply force
    setCurrentVx(0);
    k.get(CURRENT_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp & RectComp>;
      const metadata = gameDirector.getCurrentMetadata(obj as GameObj);
      if (!metadata) return;
      
      const r = new RectClass(o.pos, o.width ?? 80, o.height ?? 60);
      if (testRectPoint(r, player.pos)) {
        setCurrentVx(metadata.strength * metadata.dir);
      }
      
      // Sync arrow positions with current and animate
      const time = performance.now() / 1000;
      const pulse = Math.sin(time * 2 + metadata.pulseOffset) * 0.15 + 0.85; // Oscillate between 0.7-1.0
      
      metadata.arrows.forEach((arrow, idx) => {
        if (arrow && arrow.exists && arrow.exists()) {
          arrow.pos.x = o.pos.x + (o.width ?? 80) / 2;
          arrow.pos.y = o.pos.y + (o.height ?? 60) / 2;
          
          // Apply pulsing effect with slight offset per layer
          const layerOffset = idx * 0.1;
          arrow.opacity = (idx === 0 ? 0.4 : idx === 1 ? 0.8 : 0.9) * (pulse + layerOffset);
        }
      });
      
      // Spawn particles with moderate density (15-25 particles/sec)
      const now = performance.now();
      const particleSpawnInterval = 1000 / (15 + Math.random() * 10); // 15-25 particles/sec
      
      if (now - metadata.lastParticleSpawn > particleSpawnInterval) {
        // Spawn particle at random position within current
        const particleX = o.pos.x + Math.random() * (o.width ?? 80);
        const particleY = o.pos.y + Math.random() * (o.height ?? 60);
        const particleSize = 3 + Math.random() * 4; // 3-7px radius
        
        const particle = k.add([
          k.circle(particleSize),
          k.pos(particleX, particleY),
          k.color(150, 200, 255),
          k.opacity(0.6),
          k.z(10),
          tags.CURRENT_TAG + '_particle',
        ]) as GameObj;
        
        metadata.particles.push(particle);
        metadata.lastParticleSpawn = now;
      }
      
      // Animate particles - move in current direction and fade out
      metadata.particles = metadata.particles.filter((particle) => {
        if (!particle || !particle.exists || !particle.exists()) return false;
        
        // Move particle in the push direction
        const particleSpeed = metadata.strength * 0.8; // Slightly slower than push force
        particle.pos.x += metadata.dir * particleSpeed * dt;
        
        // Fade out over time
        particle.opacity -= dt * 0.8; // Fade out in ~0.75 seconds
        
        // Remove if too faded or out of bounds
        if (particle.opacity <= 0 || 
            particle.pos.x < o.pos.x - 50 || 
            particle.pos.x > o.pos.x + (o.width ?? 80) + 50) {
          particle.destroy();
          return false;
        }
        
        return true;
      });
    });

    // Move all hazards and destroy off-screen ones
    [ROCK_TAG, MINE_TAG, CURRENT_TAG].forEach((tag) => {
      k.get(tag).forEach((obj) => {
        const o = obj as GameObj<PosComp | VelocityComp>;
        if (o.pos.y < camTop) {
          o.tag(DESTROY);
          
          // Clean up arrows when current is destroyed
          if (tag === CURRENT_TAG) {
            const metadata = gameDirector.getCurrentMetadata(obj as GameObj);
            if (metadata) {
              metadata.arrows.forEach((arrow) => {
                if (arrow && arrow.exists && arrow.exists()) {
                  arrow.destroy();
                }
              });
              metadata.particles.forEach((particle) => {
                if (particle && particle.exists && particle.exists()) {
                  particle.destroy();
                }
              });
            }
          }
          return;
        }
        o.speedMultiplier = speedMultiplier;
        o.move(0, o.speedY * dt);
      });
    });

    // Fish horizontal movement
    k.get(FISH_TAG).forEach((obj) => {
      const o = obj as GameObj<PosComp | VelocityComp>;
      const metadata = gameDirector.getFishMetadata(obj as GameObj);
      
      o.speedMultiplier = speedMultiplier;
      o.move((metadata?.speedX ?? 0)* dt, o.speedY * dt);
      if (o.pos.x < -50 || o.pos.x > width() + 50) {
        obj.destroy();
      } else if (o.pos.y < camTop) {
        o.tag(DESTROY);
        return;
      }
    });

    // Move tunnel walls
    k.get(SIDE_WALL_TAG).forEach((obj) => {
      const o = obj as GameObj<RectComp | PosComp | VelocityComp>;
      if (o.pos.y + o.height < camTop) {
        obj.destroy();
        return;
      }
      o.speedMultiplier = speedMultiplier;
      o.move(0, o.speedY * dt);
    });

    destroyAll(DESTROY);
  });

  const cleanup = () => {
    isCleanedUp = true;
    if (updateEvent) {
      updateEvent.cancel();
      updateEvent = null;
    }
  };

  return { cleanup };
}

export type HazardControllerReturn = ReturnType<typeof hazardController>;
