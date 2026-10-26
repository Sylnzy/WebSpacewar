import { describe, it, expect } from 'vitest';
import {
  serializeMessage,
  deserializeMessage,
  generateRoomCode,
  calculatePing,
} from '../src/net/Protocol';
import { NetworkMessage } from '../src/core/Types';

describe('NetworkProtocol', () => {
  it('generates a valid 4-to-6 character alphanumeric room code', () => {
    const code1 = generateRoomCode();
    const code2 = generateRoomCode();

    expect(code1).toMatch(/^SP-[A-Z0-9]{4}$/);
    expect(code2).toMatch(/^SP-[A-Z0-9]{4}$/);
    expect(code1).not.toBe(code2);
  });

  it('serializes and deserializes command messages correctly', () => {
    const originalMsg: NetworkMessage = {
      type: 'COMMAND_DISPATCH',
      fromPlanetIds: ['p1', 'p2'],
      toPlanetId: 'p3',
      ratio: 0.5,
      timestamp: 1700000000,
    };

    const serialized = serializeMessage(originalMsg);
    expect(typeof serialized).toBe('string');

    const deserialized = deserializeMessage(serialized);
    expect(deserialized).toEqual(originalMsg);
  });

  it('safely rejects corrupted or malformed payloads', () => {
    expect(deserializeMessage('{bad:json')).toBeNull();
    expect(deserializeMessage(null)).toBeNull();
    expect(deserializeMessage(123)).toBeNull();
    expect(deserializeMessage('{"random":"payload"}')).toBeNull();
  });

  it('calculates round trip latency accurately from ping timestamps', () => {
    const clientSent = 1000;
    const clientReceived = 1080;
    const ping = calculatePing(clientSent, clientReceived);

    expect(ping).toBe(80);
  });

  it('serializes and deserializes multi-client lobby messages', () => {
    const assignMsg: NetworkMessage = {
      type: 'LOBBY_ASSIGN_ROLE',
      role: 'player3',
    };
    const updateMsg: NetworkMessage = {
      type: 'LOBBY_UPDATE',
      players: [
        { role: 'player1', name: 'Komandan (Host)' },
        { role: 'player2', name: 'Player 2' },
        { role: 'player3', name: 'Player 3' },
      ],
    };

    expect(deserializeMessage(serializeMessage(assignMsg))).toEqual(assignMsg);
    expect(deserializeMessage(serializeMessage(updateMsg))).toEqual(updateMsg);
  });
});
