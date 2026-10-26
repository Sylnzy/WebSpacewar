import { describe, it, expect } from 'vitest';
import { generateMap } from '../src/core/MapGenerator';

describe('MapGenerator', () => {
  it('generates the specified count of planets with home planets for player1 and player2', () => {
    const planets = generateMap(800, 600, 10, 12345);

    expect(planets.length).toBe(10);

    const player1Planets = planets.filter((p) => p.owner === 'player1');
    const player2Planets = planets.filter((p) => p.owner === 'player2');
    const neutralPlanets = planets.filter((p) => p.owner === 'neutral');

    expect(player1Planets.length).toBe(1);
    expect(player2Planets.length).toBe(1);
    expect(neutralPlanets.length).toBe(8);

    // Both home planets should have identical initial units and production rates
    expect(player1Planets[0].units).toBe(player2Planets[0].units);
    expect(player1Planets[0].productionRate).toBe(player2Planets[0].productionRate);
    expect(player1Planets[0].radius).toBe(player2Planets[0].radius);
  });

  it('ensures no planets overlap', () => {
    const planets = generateMap(1000, 800, 12, 42);

    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const p1 = planets[i];
        const p2 = planets[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.hypot(dx, dy);

        // Distance must be strictly greater than sum of radii
        expect(dist).toBeGreaterThanOrEqual(p1.radius + p2.radius + 15);
      }
    }
  });

  it('produces identical deterministic layouts given the same seed', () => {
    const mapA = generateMap(800, 600, 8, 9999);
    const mapB = generateMap(800, 600, 8, 9999);

    expect(mapA).toEqual(mapB);
  });

  it('keeps all planets within canvas margins', () => {
    const width = 800;
    const height = 600;
    const planets = generateMap(width, height, 10, 777);

    for (const p of planets) {
      expect(p.x - p.radius).toBeGreaterThanOrEqual(20);
      expect(p.x + p.radius).toBeLessThanOrEqual(width - 20);
      expect(p.y - p.radius).toBeGreaterThanOrEqual(20);
      expect(p.y + p.radius).toBeLessThanOrEqual(height - 20);
    }
  });

  it('generates symmetric balanced home planets for 3, 4, and 5 players', () => {
    [3, 4, 5].forEach((count) => {
      const planets = generateMap(900, 700, 15, 1000 + count, count);
      for (let i = 1; i <= count; i++) {
        const ownerPlanets = planets.filter((p) => p.owner === `player${i}`);
        expect(ownerPlanets.length).toBe(1);
        expect(ownerPlanets[0].units).toBe(50);
        expect(ownerPlanets[0].productionRate).toBe(2.5);
      }
    });
  });
});
