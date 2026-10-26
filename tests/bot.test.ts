import { describe, it, expect } from 'vitest';
import { BotAI } from '../src/ai/BotAI';
import { GameState } from '../src/core/Types';

describe('BotAI', () => {
  const createMockState = (): GameState => ({
    status: 'running',
    winner: null,
    elapsedTime: 0,
    planets: [
      {
        id: 'bot-home',
        x: 100,
        y: 100,
        radius: 35,
        owner: 'player2',
        units: 40,
        maxUnits: 150,
        productionRate: 2.5,
        productionTimer: 0,
        pulsePhase: 0,
      },
      {
        id: 'neutral-near',
        x: 200,
        y: 100,
        radius: 25,
        owner: 'neutral',
        units: 10,
        maxUnits: 80,
        productionRate: 1.2,
        productionTimer: 0,
        pulsePhase: 0,
      },
      {
        id: 'player-home',
        x: 600,
        y: 100,
        radius: 35,
        owner: 'player1',
        units: 30,
        maxUnits: 150,
        productionRate: 2.5,
        productionTimer: 0,
        pulsePhase: 0,
      },
    ],
    fleets: [],
    sendRatio: 0.5,
    selectedPlanetIds: [],
  });

  it('triggers an action when evaluation timer elapses for Easy AI', () => {
    const ai = new BotAI('player2', 'easy');
    const state = createMockState();

    // Advance small dt: should not trigger yet
    const action1 = ai.update(1.0, state);
    expect(action1).toBeNull();

    // Advance past evaluation threshold (4.0s total)
    const action2 = ai.update(3.5, state);
    expect(action2).not.toBeNull();
    expect(action2?.fromPlanetIds).toContain('bot-home');
    expect(action2?.toPlanetId).toBe('neutral-near');
    expect(action2?.ratio).toBeGreaterThan(0);
  });

  it('evaluates and attacks weak neutral planets with Medium AI', () => {
    const ai = new BotAI('player2', 'medium');
    const state = createMockState();

    // Advance 2.0s
    const action = ai.update(2.0, state);

    expect(action).not.toBeNull();
    expect(action?.fromPlanetIds[0]).toBe('bot-home');
    expect(action?.toPlanetId).toBe('neutral-near');
  });

  it('coordinates multi-source or aggressive attacks with Hard AI', () => {
    const ai = new BotAI('player2', 'hard');
    const state = createMockState();
    // Add second bot planet
    state.planets.push({
      id: 'bot-second',
      x: 150,
      y: 200,
      radius: 28,
      owner: 'player2',
      units: 35,
      maxUnits: 100,
      productionRate: 1.8,
      productionTimer: 0,
      pulsePhase: 0,
    });

    const action = ai.update(1.0, state);
    expect(action).not.toBeNull();
    expect(action?.fromPlanetIds.length).toBeGreaterThanOrEqual(1);
    expect(action?.toPlanetId).toBeDefined();
  });

  it('does nothing if bot has no owned planets', () => {
    const ai = new BotAI('player2', 'hard');
    const state = createMockState();
    state.planets[0].owner = 'neutral'; // remove bot ownership

    const action = ai.update(2.0, state);
    expect(action).toBeNull();
  });

  it('correctly tracks owner and targets other factions in multi-bot setup', () => {
    const bot2 = new BotAI('player2', 'medium');
    const bot3 = new BotAI('player3', 'medium');

    expect(bot2.getOwner()).toBe('player2');
    expect(bot3.getOwner()).toBe('player3');

    const state = createMockState();
    state.planets.push({
      id: 'p3-home',
      x: 300,
      y: 300,
      radius: 30,
      owner: 'player3',
      units: 25,
      maxUnits: 100,
      productionRate: 2,
      productionTimer: 0,
      pulsePhase: 0,
    });

    const action = bot3.update(2.0, state);
    expect(action).not.toBeNull();
    expect(action?.fromPlanetIds).toContain('p3-home');
    const targetPlanet = state.planets.find((p) => p.id === action?.toPlanetId)!;
    expect(targetPlanet.owner).not.toBe('player3');
  });
});
