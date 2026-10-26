import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/core/GameEngine';
import { Planet } from '../src/core/Types';

describe('GameEngine', () => {
  const createTestPlanets = (): Planet[] => [
    {
      id: 'p1',
      x: 100,
      y: 100,
      radius: 30,
      owner: 'player1',
      units: 20,
      maxUnits: 100,
      productionRate: 2.0,
      productionTimer: 0,
      pulsePhase: 0,
    },
    {
      id: 'p2',
      x: 300,
      y: 100,
      radius: 30,
      owner: 'neutral',
      units: 10,
      maxUnits: 100,
      productionRate: 1.0,
      productionTimer: 0,
      pulsePhase: 0,
    },
    {
      id: 'p3',
      x: 500,
      y: 100,
      radius: 30,
      owner: 'player2',
      units: 20,
      maxUnits: 100,
      productionRate: 2.0,
      productionTimer: 0,
      pulsePhase: 0,
    },
  ];

  it('regenerates units on owned planets based on dt and productionRate', () => {
    const engine = new GameEngine(createTestPlanets());
    engine.start();

    // 1 second update
    engine.update(1.0);

    const state = engine.getState();
    const p1 = state.planets.find((p) => p.id === 'p1')!;
    const p2Neutral = state.planets.find((p) => p.id === 'p2')!;

    // p1 produced 2.0 units (20 + 2 = 22)
    expect(p1.units).toBeCloseTo(22, 1);
    // Neutral planet must not produce units
    expect(p2Neutral.units).toBe(10);
  });

  it('dispatches fleet correctly when ratio is valid', () => {
    const engine = new GameEngine(createTestPlanets());
    engine.start();

    // Dispatch 50% from p1 (20 units) -> 10 units sent
    const success = engine.dispatchFleet(['p1'], 'p2', 0.5, 'player1');

    expect(success).toBe(true);
    const state = engine.getState();
    const p1 = state.planets.find((p) => p.id === 'p1')!;
    expect(p1.units).toBe(10);
    expect(state.fleets.length).toBe(1);

    const fleet = state.fleets[0];
    expect(fleet.units).toBe(10);
    expect(fleet.owner).toBe('player1');
    expect(fleet.sourcePlanetId).toBe('p1');
    expect(fleet.targetPlanetId).toBe('p2');
  });

  it('rejects dispatch if planet has less than 2 units or ratio yields 0', () => {
    const planets = createTestPlanets();
    planets[0].units = 1;
    const engine = new GameEngine(planets);
    engine.start();

    const success = engine.dispatchFleet(['p1'], 'p2', 0.5, 'player1');
    expect(success).toBe(false);
    expect(engine.getState().fleets.length).toBe(0);
  });

  it('moves fleet and triggers combat resolution upon arrival', () => {
    const engine = new GameEngine(createTestPlanets());
    engine.start();

    // p1 (x:100) -> p2 (x:300), distance = 200px. Speed = 100px/s => arrives in 2s
    engine.dispatchFleet(['p1'], 'p2', 0.75, 'player1'); // 15 units sent, p2 has 10 neutral units

    // Advance 1s: fleet still in transit
    engine.update(1.0);
    expect(engine.getState().fleets.length).toBe(1);

    // Advance another 1.2s: fleet arrives and conquers p2
    engine.update(1.2);
    expect(engine.getState().fleets.length).toBe(0);

    const p2 = engine.getState().planets.find((p) => p.id === 'p2')!;
    expect(p2.owner).toBe('player1');
    expect(p2.units).toBeGreaterThanOrEqual(5); // 15 - 10 = 5 plus slight production
  });

  it('declares winner when one player loses all planets and fleets', () => {
    const planets = createTestPlanets();
    // Neutralize player 2 initially
    planets[2].owner = 'neutral';
    const engine = new GameEngine(planets);
    engine.start();

    engine.update(0.1);
    expect(engine.getState().winner).toBe('player1');
    expect(engine.getState().status).toBe('ended');
  });

  it('handles multi-faction FFA elimination and declares last survivor winner', () => {
    const planets: Planet[] = [
      { id: 'p1', x: 100, y: 100, radius: 30, owner: 'player1', units: 20, maxUnits: 100, productionRate: 1, productionTimer: 0, pulsePhase: 0 },
      { id: 'p2', x: 200, y: 100, radius: 30, owner: 'player2', units: 20, maxUnits: 100, productionRate: 1, productionTimer: 0, pulsePhase: 0 },
      { id: 'p3', x: 300, y: 100, radius: 30, owner: 'player3', units: 20, maxUnits: 100, productionRate: 1, productionTimer: 0, pulsePhase: 0 },
    ];
    const engine = new GameEngine(planets);
    engine.start();

    // With 3 active factions, game continues
    engine.update(0.1);
    expect(engine.getState().status).toBe('running');
    expect(engine.getState().winner).toBeNull();

    // Player 2 eliminated (conquered by player1)
    planets[1].owner = 'player1';
    engine.update(0.1);
    expect(engine.getState().status).toBe('running');
    expect(engine.getState().winner).toBeNull();

    // Player 3 eliminated -> Player 1 wins
    planets[2].owner = 'player1';
    engine.update(0.1);
    expect(engine.getState().status).toBe('ended');
    expect(engine.getState().winner).toBe('player1');
  });
});
