import { GameObj, KAPLAYCtx } from 'kaplay';
import type { ActiveMask } from '../mask-controller';

type Args = {
  k: KAPLAYCtx;
  isMobile?: boolean;
  getDepth: () => number;
  getOxygen: () => number;
  getActiveMask?: () => ActiveMask;
  getBoostKickState?: () => {
    canUse: boolean;
    cooldownRemaining: number;
    hasMinOxygen: boolean;
    isSlowed: boolean;
  };
  getPlayerPos?: () => { x: number; y: number };
};

function hudController({ k, isMobile = false, getDepth, getOxygen, getActiveMask, getBoostKickState }: Args) {
  const { add, text, pos, rect, color, opacity, z, fixed, onUpdate, destroy, width, height, anchor } = k;

  // Adjust positioning and sizing based on platform
  const labelSize = isMobile ? 16 : 24;
  const centerX = width() / 2;

  const depthLabel = add([
    text('Depth: 0m', { size: labelSize }),
    pos(isMobile ? 8 : 8, 8),
    z(10),
    fixed(),
  ]) as GameObj;

  const oxygenLabel = add([
    text('O2: 100%', { size: labelSize }),
    pos(isMobile ? centerX : 8, isMobile ? 8 : 50),
    anchor(isMobile ? 'top' : 'topleft'),
    z(10),
    fixed(),
  ]) as GameObj;

  const maskLabel = add([
    text('', { size: labelSize }),
    pos(isMobile ? width() - 8 : 8, isMobile ? 8 : 92),
    anchor(isMobile ? 'topright' : 'topleft'),
    z(10),
    fixed(),
  ]) as GameObj;

  const boostKickLabel = add([
    text('', { size: isMobile ? 16 : 20 }),
    pos(width() - 10, isMobile ? 30 : 10),
    anchor('topright'),
    z(10),
    fixed(),
  ]) as GameObj;

  // Progressive darkness overlay (increases with depth)
  const depthDarknessOverlay = add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0),
    z(8),
    fixed(),
  ]) as GameObj;

  // Vignette effect for blind mask (edge rectangles creating darkness at edges)
  const vignetteRects: GameObj[] = [];
  
  // Create vignette layers - multiple edge rectangles with increasing opacity
  // This creates a gradient effect from edges (dark) to center (clear)
  const vignetteLayerCount = 8;
  const maxVignetteThickness = Math.min(width(), height()) * 0.4; // 40% of screen
  
  for (let layer = 0; layer < vignetteLayerCount; layer++) {
    const progress = layer / vignetteLayerCount;
    const thickness = maxVignetteThickness * (1 - progress);
    
    // Top rect
    vignetteRects.push(add([
      rect(width(), thickness),
      pos(0, 0),
      color(0, 0, 0),
      opacity(0),
      z(9),
      fixed(),
    ]) as GameObj);
    
    // Bottom rect
    vignetteRects.push(add([
      rect(width(), thickness),
      pos(0, height() - thickness),
      color(0, 0, 0),
      opacity(0),
      z(9),
      fixed(),
    ]) as GameObj);
    
    // Left rect (excluding top/bottom already covered)
    vignetteRects.push(add([
      rect(thickness, height() - 2 * thickness),
      pos(0, thickness),
      color(0, 0, 0),
      opacity(0),
      z(9),
      fixed(),
    ]) as GameObj);
    
    // Right rect (excluding top/bottom already covered)
    vignetteRects.push(add([
      rect(thickness, height() - 2 * thickness),
      pos(width() - thickness, thickness),
      color(0, 0, 0),
      opacity(0),
      z(9),
      fixed(),
    ]) as GameObj);
  }

  // Touch feedback overlays for mobile (visible down to mid-depth ~750m)
  const touchOverlays: GameObj[] = [];
  
  if (isMobile) {
    const lowerThirdY = height() * 0.67;
    const leftThird = width() / 3;
    const rightThird = width() * 2 / 3;
    
    // Left side overlay
    touchOverlays.push(add([
      rect(width() / 2, lowerThirdY),
      pos(0, 0),
      color(100, 150, 255),
      opacity(0),
      z(7),
      fixed(),
    ]) as GameObj);
    
    // Right side overlay
    touchOverlays.push(add([
      rect(width() / 2, lowerThirdY),
      pos(width() / 2, 0),
      color(100, 150, 255),
      opacity(0),
      z(7),
      fixed(),
    ]) as GameObj);
    
    // Lower-left diagonal overlay
    touchOverlays.push(add([
      rect(leftThird, height() - lowerThirdY),
      pos(0, lowerThirdY),
      color(150, 100, 255),
      opacity(0),
      z(7),
      fixed(),
    ]) as GameObj);
    
    // Lower-center down overlay
    touchOverlays.push(add([
      rect(rightThird - leftThird, height() - lowerThirdY),
      pos(leftThird, lowerThirdY),
      color(255, 150, 100),
      opacity(0),
      z(7),
      fixed(),
    ]) as GameObj);
    
    // Lower-right diagonal overlay
    touchOverlays.push(add([
      rect(width() - rightThird, height() - lowerThirdY),
      pos(rightThird, lowerThirdY),
      color(150, 100, 255),
      opacity(0),
      z(7),
      fixed(),
    ]) as GameObj);
  }

  let isCleanedUp = false;

  onUpdate(() => {
    if (isCleanedUp) return;
    depthLabel.text = `Depth: ${Math.floor(getDepth())}m`;
    oxygenLabel.text = `O2: ${Math.floor(getOxygen())}%`;

    // Update progressive darkness based on depth (exponential, max 90% at 3000m)
    const depth = getDepth();
    const maxDepth = 3000;
    const depthProgress = Math.min(depth / maxDepth, 1);
    const darknessOpacity = depthProgress * depthProgress * 0.9; // Exponential curve
    depthDarknessOverlay.opacity = darknessOpacity;

    // Update touch feedback overlays (fade out from 0-750m depth)
    if (isMobile) {
      const midDepth = 750;
      const touchOpacity = Math.max(0, 1 - (depth / midDepth)) * 0.15;
      touchOverlays.forEach(overlay => {
        overlay.opacity = touchOpacity;
      });
    }

    const mask = getActiveMask?.() ?? null;
    const now = performance.now();
    if (mask && mask.expiresAt > now) {
      const secs = Math.ceil((mask.expiresAt - now) / 1000);
      const name = mask.type.charAt(0).toUpperCase() + mask.type.slice(1);
      maskLabel.text = `${name} ${secs}s`;
      maskLabel.hidden = false;
      if (mask.type === 'blind') {
        // Activate vignette effect - darken edges with gradient
        vignetteRects.forEach((rect, i) => {
          const layer = Math.floor(i / 4); // 4 rects per layer
          const layerOpacity = (layer + 1) / vignetteLayerCount * 0.85;
          rect.opacity = layerOpacity;
        });
      } else {
        // Hide vignette when not blind
        vignetteRects.forEach(rect => {
          rect.opacity = 0;
        });
      }
    } else {
      maskLabel.text = '';
      maskLabel.hidden = true;
      // Hide vignette when no mask active
      vignetteRects.forEach(rect => {
        rect.opacity = 0;
      });
    }

    // Boost indicator
    const boostState = getBoostKickState?.();
    if (boostState) {
      if (boostState.canUse) {
        boostKickLabel.text = 'Boost: READY';
        boostKickLabel.color = k.rgb(0, 255, 0); // Green
      } else if (boostState.cooldownRemaining > 0) {
        boostKickLabel.text = `Boost: ${boostState.cooldownRemaining}s`;
        boostKickLabel.color = k.rgb(255, 255, 0); // Yellow
      } else if (!boostState.hasMinOxygen) {
        boostKickLabel.text = 'Boost: LOW O2';
        boostKickLabel.color = k.rgb(255, 0, 0); // Red
      } else if (boostState.isSlowed) {
        boostKickLabel.text = 'Boost: SLOWED';
        boostKickLabel.color = k.rgb(255, 0, 0); // Red
      }
      boostKickLabel.hidden = false;
    } else {
      boostKickLabel.hidden = true;
    }
  });

  const cleanup = () => {
    isCleanedUp = true;
    destroy(depthLabel);
    destroy(oxygenLabel);
    destroy(maskLabel);
    destroy(boostKickLabel);
    destroy(depthDarknessOverlay);
    vignetteRects.forEach(rect => destroy(rect));
    touchOverlays.forEach(overlay => destroy(overlay));
  };

  return { cleanup };
}

export default hudController;
export type HudControllerReturn = ReturnType<typeof hudController>;
