import { Planet, Fleet, CombatResult } from './Types';

/**
 * Resolves arrival of an attacking or reinforcing fleet onto a target planet.
 */
export function resolveCombat(planet: Planet, fleet: Fleet): CombatResult {
  const previousOwner = planet.owner;

  // Case 1: Friendly reinforcement
  if (planet.owner === fleet.owner) {
    planet.units = Math.min(planet.maxUnits, planet.units + fleet.units);
    return {
      conquered: false,
      friendly: true,
      survivingUnits: planet.units,
      previousOwner,
      newOwner: planet.owner,
    };
  }

  // Case 2: Hostile invasion / neutral capture
  if (fleet.units > planet.units) {
    // Conquest successful
    const surviving = fleet.units - planet.units;
    planet.owner = fleet.owner;
    planet.units = surviving;
    return {
      conquered: true,
      friendly: false,
      survivingUnits: surviving,
      previousOwner,
      newOwner: planet.owner,
    };
  }

  // Case 3: Defense successfully repels invasion or exact tie
  const remainingDefense = planet.units - fleet.units;
  planet.units = Math.max(0, remainingDefense);
  return {
    conquered: false,
    friendly: false,
    survivingUnits: planet.units,
    previousOwner,
    newOwner: planet.owner,
  };
}
