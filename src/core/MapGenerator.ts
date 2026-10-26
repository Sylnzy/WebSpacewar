import { Planet, PlanetOwner } from './Types';

/**
 * Seedable pseudo-random number generator (Mulberry32).
 */
class PRNG {
  private state: number;

  constructor(seed: number = 123456789) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

/**
 * Generates a fair, balanced, non-overlapping planet map.
 */
export function generateMap(
  width: number,
  height: number,
  planetCount: number = 10,
  seed: number = Date.now(),
  playerCount: number = 2
): Planet[] {
  const clampedPlayerCount = Math.min(5, Math.max(2, playerCount));
  const effectivePlanetCount = Math.max(planetCount, clampedPlayerCount + 4);
  const rng = new PRNG(seed);
  const planets: Planet[] = [];
  const padding = 55;
  const minSpacing = 20;

  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Place Home Planets radially across center
  const homeRadius = 35;
  const homeUnits = 50;
  const homeProduction = 2.5;
  const homeOffsetDist = Math.min(width, height) * 0.35;
  const baseAngle = rng.range(0, Math.PI * 2);

  const playerOwners: PlanetOwner[] = ['player1', 'player2', 'player3', 'player4', 'player5'];

  for (let i = 0; i < clampedPlayerCount; i++) {
    const angle = baseAngle + (i * 2 * Math.PI) / clampedPlayerCount;
    const px = centerX + Math.cos(angle) * homeOffsetDist;
    const py = centerY + Math.sin(angle) * homeOffsetDist;

    planets.push({
      id: `p-home-${i + 1}`,
      x: Math.round(px),
      y: Math.round(py),
      radius: homeRadius,
      owner: playerOwners[i],
      units: homeUnits,
      maxUnits: 150,
      productionRate: homeProduction,
      productionTimer: 0,
      pulsePhase: (i * Math.PI * 2) / clampedPlayerCount,
    });
  }

  // Helper collision check
  const doesOverlap = (x: number, y: number, radius: number): boolean => {
    // Check bounds
    if (
      x - radius < 25 ||
      x + radius > width - 25 ||
      y - radius < 25 ||
      y + radius > height - 25
    ) {
      return true;
    }

    for (const p of planets) {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < p.radius + radius + minSpacing) {
        return true;
      }
    }
    return false;
  };

  // 2. Place Neutral Planets
  const neutralsNeeded = Math.max(0, effectivePlanetCount - clampedPlayerCount);
  let neutralIdx = 0;

  for (let i = 0; i < neutralsNeeded; i++) {
    let placed = false;
    let attempts = 0;

    // Varied neutral radius & properties
    const radius = rng.rangeInt(18, 38);
    const units = rng.rangeInt(5, 30);
    const prodRate = Math.round((0.8 + (radius / 38) * 1.4) * 10) / 10;
    const maxUnits = Math.round(radius * 3.5);

    while (!placed && attempts < 250) {
      attempts++;
      const candX = Math.round(rng.range(padding, width - padding));
      const candY = Math.round(rng.range(padding, height - padding));

      if (!doesOverlap(candX, candY, radius)) {
        planets.push({
          id: `p-neutral-${neutralIdx++}`,
          x: candX,
          y: candY,
          radius,
          owner: 'neutral',
          units,
          maxUnits,
          productionRate: prodRate,
          productionTimer: 0,
          pulsePhase: rng.range(0, Math.PI * 2),
        });
        placed = true;
      }
    }
  }

  return planets;
}
