import { describe, it, expect } from 'vitest';
import { resolveCombat } from '../src/core/CombatResolver';
import { Planet, Fleet } from '../src/core/Types';

describe('CombatResolver', () => {
  const createPlanet = (overrides: Partial<Planet> = {}): Planet => ({
    id: 'p1',
    x: 100,
    y: 100,
    radius: 25,
    owner: 'neutral',
    units: 10,
    maxUnits: 100,
    productionRate: 1.5,
    productionTimer: 0,
    pulsePhase: 0,
    ...overrides,
  });

  const createFleet = (overrides: Partial<Fleet> = {}): Fleet => ({
    id: 'f1',
    sourcePlanetId: 'p0',
    targetPlanetId: 'p1',
    owner: 'player1',
    units: 15,
    x: 50,
    y: 50,
    targetX: 100,
    targetY: 100,
    speed: 120,
    totalDistance: 100,
    traveledDistance: 100,
    ...overrides,
  });

  it('reinforces friendly planet when fleet arrives', () => {
    const planet = createPlanet({ owner: 'player1', units: 20 });
    const fleet = createFleet({ owner: 'player1', units: 15 });

    const result = resolveCombat(planet, fleet);

    expect(result.conquered).toBe(false);
    expect(result.friendly).toBe(true);
    expect(planet.owner).toBe('player1');
    expect(planet.units).toBe(35);
  });

  it('conquers enemy/neutral planet when fleet exceeds garrison', () => {
    const planet = createPlanet({ owner: 'neutral', units: 10 });
    const fleet = createFleet({ owner: 'player1', units: 25 });

    const result = resolveCombat(planet, fleet);

    expect(result.conquered).toBe(true);
    expect(result.friendly).toBe(false);
    expect(planet.owner).toBe('player1');
    expect(planet.units).toBe(15);
  });

  it('defends planet when garrison exceeds invading fleet', () => {
    const planet = createPlanet({ owner: 'player2', units: 30 });
    const fleet = createFleet({ owner: 'player1', units: 10 });

    const result = resolveCombat(planet, fleet);

    expect(result.conquered).toBe(false);
    expect(result.friendly).toBe(false);
    expect(planet.owner).toBe('player2');
    expect(planet.units).toBe(20);
  });

  it('handles exact draw by depleting garrison to 0 without ownership flip', () => {
    const planet = createPlanet({ owner: 'player2', units: 20 });
    const fleet = createFleet({ owner: 'player1', units: 20 });

    const result = resolveCombat(planet, fleet);

    expect(result.conquered).toBe(false);
    expect(result.friendly).toBe(false);
    expect(planet.owner).toBe('player2');
    expect(planet.units).toBe(0);
  });
});
