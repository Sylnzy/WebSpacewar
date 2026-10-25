import { Planet, PlanetOwner, GameState } from '../core/Types';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIAction {
  fromPlanetIds: string[];
  toPlanetId: string;
  ratio: number;
}

export class BotAI {
  private owner: PlanetOwner;
  private difficulty: AIDifficulty;
  private timer: number = 0;
  private interval: number;

  constructor(owner: PlanetOwner = 'player2', difficulty: AIDifficulty = 'medium') {
    this.owner = owner;
    this.difficulty = difficulty;
    this.interval = this.getInterval(difficulty);
  }

  private getInterval(difficulty: AIDifficulty): number {
    switch (difficulty) {
      case 'easy':
        return 4.0;
      case 'medium':
        return 1.8;
      case 'hard':
        return 0.8;
    }
  }

  public update(dt: number, state: GameState): AIAction | null {
    if (state.status !== 'running') return null;

    this.timer += dt;
    if (this.timer < this.interval) {
      return null;
    }

    this.timer = 0; // reset evaluation clock

    const myPlanets = state.planets.filter(
      (p) => p.owner === this.owner && p.units >= 8
    );
    if (myPlanets.length === 0) return null;

    const targets = state.planets.filter((p) => p.owner !== this.owner);
    if (targets.length === 0) return null;

    switch (this.difficulty) {
      case 'easy':
        return this.planEasy(myPlanets, targets);
      case 'medium':
        return this.planMedium(myPlanets, targets);
      case 'hard':
        return this.planHard(myPlanets, targets, state);
    }
  }

  private planEasy(myPlanets: Planet[], targets: Planet[]): AIAction | null {
    const readyPlanets = myPlanets.filter((p) => p.units >= 15);
    if (readyPlanets.length === 0) return null;

    const source = readyPlanets[Math.floor(Math.random() * readyPlanets.length)];
    const neutralTargets = targets.filter((t) => t.owner === 'neutral');
    const candTargets = neutralTargets.length > 0 ? neutralTargets : targets;

    // Pick closest
    let closestTarget = candTargets[0];
    let minDist = Infinity;

    for (const t of candTargets) {
      const dist = Math.hypot(source.x - t.x, source.y - t.y);
      if (dist < minDist) {
        minDist = dist;
        closestTarget = t;
      }
    }

    return {
      fromPlanetIds: [source.id],
      toPlanetId: closestTarget.id,
      ratio: 0.5,
    };
  }

  private planMedium(myPlanets: Planet[], targets: Planet[]): AIAction | null {
    let bestScore = -Infinity;
    let bestSource: Planet | null = null;
    let bestTarget: Planet | null = null;

    for (const source of myPlanets) {
      for (const target of targets) {
        const dist = Math.hypot(source.x - target.x, source.y - target.y);
        const sends = source.units * 0.5;

        // Advantage multiplier for neutrals and easily conquerable targets
        let bonus = 1.0;
        if (target.owner === 'neutral') {
          bonus = 1.6;
        } else if (sends > target.units) {
          bonus = 2.2;
        }

        const score = (bonus * 1000) / (dist + target.units * 5 + 1);

        if (score > bestScore) {
          bestScore = score;
          bestSource = source;
          bestTarget = target;
        }
      }
    }

    if (!bestSource || !bestTarget) return null;

    return {
      fromPlanetIds: [bestSource.id],
      toPlanetId: bestTarget.id,
      ratio: 0.5,
    };
  }

  private planHard(myPlanets: Planet[], targets: Planet[], state: GameState): AIAction | null {
    // 1. Opportunistic counter-attack: check if an enemy planet has very low defense
    const enemyPlanets = targets.filter((t) => t.owner !== 'neutral');
    const vulnerableEnemy = enemyPlanets.find((ep) => ep.units <= 12);

    let chosenTarget: Planet = targets[0];

    if (vulnerableEnemy) {
      chosenTarget = vulnerableEnemy;
    } else {
      // Pick target based on lowest defense & distance
      let lowestScore = Infinity;
      for (const t of targets) {
        const avgDist =
          myPlanets.reduce((acc, p) => acc + Math.hypot(p.x - t.x, p.y - t.y), 0) /
          myPlanets.length;
        const score = t.units * 1.5 + avgDist * 0.2;
        if (score < lowestScore) {
          lowestScore = score;
          chosenTarget = t;
        }
      }
    }

    // 2. Select sources: if target has high garrison, mobilize multiple planets
    const sourcesToUse: string[] = [];
    let accumulatedUnits = 0;

    // Sort myPlanets by unit count descending
    const sortedPlanets = [...myPlanets].sort((a, b) => b.units - a.units);

    for (const p of sortedPlanets) {
      sourcesToUse.push(p.id);
      accumulatedUnits += p.units * 0.6;
      if (accumulatedUnits > chosenTarget.units * 1.3) {
        break; // enough force gathered
      }
    }

    return {
      fromPlanetIds: sourcesToUse,
      toPlanetId: chosenTarget.id,
      ratio: 0.65,
    };
  }
}
