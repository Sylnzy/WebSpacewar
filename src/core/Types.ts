export type PlanetOwner = 'neutral' | 'player1' | 'player2' | 'player3' | 'player4' | 'player5';

export interface Planet {
  id: string;
  x: number;
  y: number;
  radius: number;           // 18px s.d. 45px
  owner: PlanetOwner;
  units: number;            // Jumlah pasukan di planet
  maxUnits: number;         // Kapasitas maksimum
  productionRate: number;   // Unit per detik
  productionTimer: number;  // Timer akumulasi
  pulsePhase: number;       // Efek denyut neon
}

export interface Fleet {
  id: string;
  sourcePlanetId: string;
  targetPlanetId: string;
  owner: PlanetOwner;
  units: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;            // Kecepatan piksel/detik
  totalDistance: number;
  traveledDistance: number;
}

export type GameStatus = 'waiting' | 'running' | 'paused' | 'ended';

export interface GameState {
  status: GameStatus;
  winner: PlanetOwner | null;
  elapsedTime: number;
  planets: Planet[];
  fleets: Fleet[];
  sendRatio: number;        // 0.25, 0.50, 0.75, 1.00
  selectedPlanetIds: string[];
}

export interface CombatResult {
  conquered: boolean;
  friendly: boolean;
  survivingUnits: number;
  previousOwner: PlanetOwner;
  newOwner: PlanetOwner;
}

export type NetworkMessage =
  | { type: 'LOBBY_READY'; role: 'host' | 'guest'; name: string }
  | { type: 'LOBBY_ASSIGN_ROLE'; role: PlanetOwner }
  | { type: 'LOBBY_UPDATE'; players: { role: PlanetOwner; name: string }[] }
  | { type: 'GAME_START'; seed: number; planets: Planet[]; playerCount: number }
  | { type: 'COMMAND_DISPATCH'; fromPlanetIds: string[]; toPlanetId: string; ratio: number; timestamp: number; owner?: PlanetOwner }
  | { type: 'STATE_SNAPSHOT'; state: GameState; timestamp: number }
  | { type: 'PEER_PING'; clientTime: number }
  | { type: 'PEER_PONG'; clientTime: number; serverTime: number }
  | { type: 'PLAYER_SURRENDER'; owner: PlanetOwner };
