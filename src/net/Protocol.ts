import { NetworkMessage } from '../core/Types';

const VALID_TYPES = new Set([
  'LOBBY_READY',
  'GAME_START',
  'COMMAND_DISPATCH',
  'STATE_SNAPSHOT',
  'PEER_PING',
  'PEER_PONG',
  'PLAYER_SURRENDER',
]);

/**
 * Generates an uppercase 4-character room code prefixed with 'SP-'.
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars like O, 0, 1, I
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SP-${result}`;
}

/**
 * Serializes a NetworkMessage into a JSON string.
 */
export function serializeMessage(msg: NetworkMessage): string {
  return JSON.stringify(msg);
}

/**
 * Deserializes and validates a received raw payload into a NetworkMessage.
 */
export function deserializeMessage(raw: unknown): NetworkMessage | null {
  if (typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.type !== 'string' || !VALID_TYPES.has(parsed.type)) {
      return null;
    }
    return parsed as NetworkMessage;
  } catch {
    return null;
  }
}

/**
 * Calculates latency in milliseconds between ping transmit and pong receipt.
 */
export function calculatePing(sentTime: number, receivedTime: number): number {
  return Math.max(0, receivedTime - sentTime);
}
