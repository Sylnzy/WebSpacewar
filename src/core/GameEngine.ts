import { Planet, Fleet, PlanetOwner, GameState, GameStatus, CombatResult } from './Types';
import { resolveCombat } from './CombatResolver';

export type CombatCallback = (result: CombatResult, planet: Planet, fleet: Fleet) => void;
export type GameOverCallback = (winner: PlanetOwner) => void;

export class GameEngine {
  private state: GameState;
  public onCombatResult?: CombatCallback;
  public onGameOver?: GameOverCallback;

  private fleetSpeed: number = 110; // px per second
  private fleetCounter: number = 0;

  constructor(initialPlanets: Planet[] = []) {
    this.state = {
      status: 'waiting',
      winner: null,
      elapsedTime: 0,
      planets: initialPlanets,
      fleets: [],
      sendRatio: 0.5,
      selectedPlanetIds: [],
    };
  }

  public start(): void {
    this.state.status = 'running';
  }

  public pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
    }
  }

  public resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public setState(newState: GameState): void {
    this.state = newState;
  }

  public setSendRatio(ratio: number): void {
    this.state.sendRatio = Math.max(0.1, Math.min(1.0, ratio));
  }

  public setSelectedPlanets(ids: string[]): void {
    this.state.selectedPlanetIds = [...ids];
  }

  public toggleSelectPlanet(id: string, multiSelect: boolean = false): void {
    const planet = this.state.planets.find((p) => p.id === id);
    if (!planet) return;

    if (!multiSelect) {
      if (this.state.selectedPlanetIds.includes(id)) {
        this.state.selectedPlanetIds = [];
      } else {
        this.state.selectedPlanetIds = [id];
      }
      return;
    }

    if (this.state.selectedPlanetIds.includes(id)) {
      this.state.selectedPlanetIds = this.state.selectedPlanetIds.filter((pId) => pId !== id);
    } else {
      this.state.selectedPlanetIds.push(id);
    }
  }

  public selectAllPlanets(owner: PlanetOwner): void {
    this.state.selectedPlanetIds = this.state.planets
      .filter((p) => p.owner === owner)
      .map((p) => p.id);
  }

  public clearSelection(): void {
    this.state.selectedPlanetIds = [];
  }

  /**
   * Dispatches fleets from specified source planets to target planet.
   */
  public dispatchFleet(
    fromPlanetIds: string[],
    toPlanetId: string,
    ratio: number = this.state.sendRatio,
    ownerFilter?: PlanetOwner
  ): boolean {
    const targetPlanet = this.state.planets.find((p) => p.id === toPlanetId);
    if (!targetPlanet) return false;

    let dispatchedAny = false;

    for (const fromId of fromPlanetIds) {
      if (fromId === toPlanetId) continue; // cannot dispatch to self

      const sourcePlanet = this.state.planets.find((p) => p.id === fromId);
      if (!sourcePlanet) continue;

      if (ownerFilter && sourcePlanet.owner !== ownerFilter) {
        continue;
      }

      if (sourcePlanet.units < 2) continue;

      const unitsToSend = Math.floor(sourcePlanet.units * ratio);
      if (unitsToSend < 1) continue;

      sourcePlanet.units -= unitsToSend;

      const dx = targetPlanet.x - sourcePlanet.x;
      const dy = targetPlanet.y - sourcePlanet.y;
      const totalDistance = Math.hypot(dx, dy);

      const fleet: Fleet = {
        id: `fleet-${++this.fleetCounter}-${Date.now()}`,
        sourcePlanetId: sourcePlanet.id,
        targetPlanetId: targetPlanet.id,
        owner: sourcePlanet.owner,
        units: unitsToSend,
        x: sourcePlanet.x,
        y: sourcePlanet.y,
        targetX: targetPlanet.x,
        targetY: targetPlanet.y,
        speed: this.fleetSpeed,
        totalDistance,
        traveledDistance: 0,
      };

      this.state.fleets.push(fleet);
      dispatchedAny = true;
    }

    return dispatchedAny;
  }

  /**
   * Main simulation update loop called with fixed timestep delta.
   */
  public update(dt: number): void {
    if (this.state.status !== 'running') return;

    this.state.elapsedTime += dt;

    // 1. Update Planet Production & Visual Pulses
    for (const planet of this.state.planets) {
      planet.pulsePhase = (planet.pulsePhase + dt * 2.5) % (Math.PI * 2);

      if (planet.owner !== 'neutral') {
        planet.units = Math.min(
          planet.maxUnits,
          planet.units + planet.productionRate * dt
        );
      }
    }

    // 2. Update Fleet Swarms
    const remainingFleets: Fleet[] = [];

    for (const fleet of this.state.fleets) {
      fleet.traveledDistance += fleet.speed * dt;
      const t = Math.min(1.0, fleet.traveledDistance / fleet.totalDistance);

      const sourcePlanet = this.state.planets.find((p) => p.id === fleet.sourcePlanetId);
      const startX = sourcePlanet ? sourcePlanet.x : fleet.x;
      const startY = sourcePlanet ? sourcePlanet.y : fleet.y;

      fleet.x = startX + (fleet.targetX - startX) * t;
      fleet.y = startY + (fleet.targetY - startY) * t;

      if (t >= 1.0) {
        // Fleet arrived at target
        const targetPlanet = this.state.planets.find((p) => p.id === fleet.targetPlanetId);
        if (targetPlanet) {
          const result = resolveCombat(targetPlanet, fleet);
          this.onCombatResult?.(result, targetPlanet, fleet);
        }
      } else {
        remainingFleets.push(fleet);
      }
    }

    this.state.fleets = remainingFleets;

    // 3. Victory Condition Check
    this.checkWinner();
  }

  private checkWinner(): void {
    if (this.state.status !== 'running') return;

    const p1Planets = this.state.planets.filter((p) => p.owner === 'player1').length;
    const p1Fleets = this.state.fleets.filter((f) => f.owner === 'player1').length;

    const p2Planets = this.state.planets.filter((p) => p.owner === 'player2').length;
    const p2Fleets = this.state.fleets.filter((f) => f.owner === 'player2').length;

    const p1Active = p1Planets > 0 || p1Fleets > 0;
    const p2Active = p2Planets > 0 || p2Fleets > 0;

    if (!p1Active && p2Active) {
      this.state.winner = 'player2';
      this.state.status = 'ended';
      this.onGameOver?.('player2');
    } else if (!p2Active && p1Active) {
      this.state.winner = 'player1';
      this.state.status = 'ended';
      this.onGameOver?.('player1');
    }
  }
}
