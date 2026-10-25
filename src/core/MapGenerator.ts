import { Planet } from './Types';

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
  seed: number = Date.now()
): Planet[] {
  const rng = new PRNG(seed);
  const planets: Planet[] = [];
  const padding = 55;
  const minSpacing = 20;

  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Place Home Planets symmetrically across center
  const homeRadius = 35;
  const homeUnits = 50;
  const homeProduction = 2.5;
  const homeOffsetDist = Math.min(width, height) * 0.35;
  const homeAngle = rng.range(0, Math.PI); // random axis

  const p1X = centerX - Math.cos(homeAngle) * homeOffsetDist;
  const p1Y = centerY - Math.sin(homeAngle) * homeOffsetDist;

  const p2X = centerX + Math.cos(homeAngle) * homeOffsetDist;
  const p2Y = centerY + Math.sin(homeAngle) * homeOffsetDist;

  const player1Home: Planet = {
    id: 'p-home-1',
    x: Math.round(p1X),
    y: Math.round(p1Y),
    radius: homeRadius,
    owner: 'player1',
    units: homeUnits,
    maxUnits: 150,
    productionRate: homeProduction,
    productionTimer: 0,
    pulsePhase: 0,
  };

  const player2Home: Planet = {
    id: 'p-home-2',
    x: Math.round(p2X),
    y: Math.round(p2Y),
    radius: homeRadius,
    owner: 'player2',
    units: homeUnits,
    maxUnits: 150,
    productionRate: homeProduction,
    productionTimer: 0,
    pulsePhase: Math.PI,
  };

  planets.push(player1Home, player2Home);

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
  const neutralsNeeded = Math.max(0, planetCount - 2);
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
