import { Peer, DataConnection } from 'peerjs';
import { NetworkMessage, PlanetOwner } from '../core/Types';
import {
  generateRoomCode,
  serializeMessage,
  deserializeMessage,
  calculatePing,
} from './Protocol';

export type Role = 'host' | 'guest';

export interface ConnectedPlayer {
  conn: DataConnection;
  role: PlanetOwner;
  name: string;
}

export interface NetworkCallbacks {
  onConnected?: (peerId: string) => void;
  onDisconnected?: (reason?: string) => void;
  onMessage?: (msg: NetworkMessage, fromPeerId?: string) => void;
  onPingUpdate?: (pingMs: number) => void;
  onError?: (err: Error) => void;
  onPlayerJoined?: (role: PlanetOwner, peerId: string) => void;
  onPlayerLeft?: (role: PlanetOwner, peerId: string) => void;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private guestConnection: DataConnection | null = null;
  private connections: Map<string, ConnectedPlayer> = new Map();
  private role: Role = 'host';
  private callbacks: NetworkCallbacks = {};
  private currentPing: number = 0;
  private pingIntervalId: number | null = null;

  constructor(callbacks: NetworkCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: NetworkCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getRole(): Role {
    return this.role;
  }

  public getPing(): number {
    return this.currentPing;
  }

  public isConnected(): boolean {
    if (this.role === 'host') {
      return this.connections.size > 0;
    }
    return this.guestConnection !== null && this.guestConnection.open;
  }

  public getConnectedCount(): number {
    return this.role === 'host' ? this.connections.size : (this.guestConnection?.open ? 1 : 0);
  }

  public getPlayers(): { role: PlanetOwner; name: string }[] {
    const list: { role: PlanetOwner; name: string }[] = [
      { role: 'player1', name: 'Komandan (Host)' },
    ];
    for (const p of this.connections.values()) {
      list.push({ role: p.role, name: p.name });
    }
    return list;
  }

  /**
   * Creates a room as Host. Uses custom roomCode or generates one.
   */
  public async createRoom(desiredCode?: string): Promise<string> {
    this.disconnect();
    this.role = 'host';

    const roomCode = desiredCode || generateRoomCode();
    // Normalize room code to lowercase for PeerJS ID compatibility
    const peerId = `webspacewar-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

        this.peer.on('open', () => {
          resolve(roomCode);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingHostConnection(conn);
        });

        this.peer.on('error', (err) => {
          this.callbacks.onError?.(err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Joins an existing room as Guest using roomCode.
   */
  public async joinRoom(roomCode: string): Promise<void> {
    this.disconnect();
    this.role = 'guest';

    const targetPeerId = `webspacewar-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 1,
        });

        this.peer.on('open', () => {
          if (!this.peer) return;
          const conn = this.peer.connect(targetPeerId, {
            reliable: true,
          });
          this.setupGuestConnection(conn);

          conn.on('open', () => {
            resolve();
          });

          conn.on('error', (err) => {
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          this.callbacks.onError?.(err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleIncomingHostConnection(conn: DataConnection): void {
    // Max 4 guests (5 players total)
    if (this.connections.size >= 4) {
      conn.close();
      return;
    }

    const availableRoles: PlanetOwner[] = ['player2', 'player3', 'player4', 'player5'];
    const usedRoles = new Set(Array.from(this.connections.values()).map((p) => p.role));
    const nextRole = availableRoles.find((r) => !usedRoles.has(r)) || 'player2';

    const playerRoleNumber = nextRole.replace('player', '');
    const playerEntry: ConnectedPlayer = {
      conn,
      role: nextRole,
      name: `Player ${playerRoleNumber}`,
    };

    conn.on('open', () => {
      this.connections.set(conn.peer, playerEntry);
      this.callbacks.onConnected?.(conn.peer);
      this.callbacks.onPlayerJoined?.(nextRole, conn.peer);

      // Assign assigned role to this guest
      this.sendToConn(conn, {
        type: 'LOBBY_ASSIGN_ROLE',
        role: nextRole,
      });

      // Broadcast full player list to all connected players
      this.broadcast({
        type: 'LOBBY_UPDATE',
        players: this.getPlayers(),
      });
    });

    conn.on('data', (raw: unknown) => {
      const msg = deserializeMessage(raw);
      if (!msg) return;

      if (msg.type === 'PEER_PING') {
        this.sendToConn(conn, {
          type: 'PEER_PONG',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        });
        return;
      }

      this.callbacks.onMessage?.(msg, conn.peer);
    });

    conn.on('close', () => {
      const leaving = this.connections.get(conn.peer);
      if (leaving) {
        this.connections.delete(conn.peer);
        this.callbacks.onPlayerLeft?.(leaving.role, conn.peer);
        this.broadcast({
          type: 'LOBBY_UPDATE',
          players: this.getPlayers(),
        });
      }
      if (this.connections.size === 0) {
        this.callbacks.onDisconnected?.('Semua pemain telah keluar');
      }
    });

    conn.on('error', (err) => {
      this.callbacks.onError?.(new Error(`Connection error with ${conn.peer}: ${err}`));
    });
  }

  private setupGuestConnection(conn: DataConnection): void {
    this.guestConnection = conn;

    conn.on('open', () => {
      this.callbacks.onConnected?.(conn.peer);
      this.startPingLoop();
    });

    conn.on('data', (raw: unknown) => {
      const msg = deserializeMessage(raw);
      if (!msg) return;

      if (msg.type === 'PEER_PONG') {
        this.currentPing = calculatePing(msg.clientTime, Date.now());
        this.callbacks.onPingUpdate?.(this.currentPing);
        return;
      }

      this.callbacks.onMessage?.(msg, conn.peer);
    });

    conn.on('close', () => {
      this.stopPingLoop();
      this.guestConnection = null;
      this.callbacks.onDisconnected?.('Host menutup koneksi room');
    });

    conn.on('error', (err) => {
      this.callbacks.onError?.(new Error(`Connection error: ${err}`));
    });
  }

  private sendToConn(conn: DataConnection, msg: NetworkMessage): boolean {
    if (!conn || !conn.open) return false;
    try {
      conn.send(serializeMessage(msg));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Broadcasts message to all connected peers if host, or sends to host if guest.
   */
  public broadcast(msg: NetworkMessage): void {
    if (this.role === 'host') {
      const serialized = serializeMessage(msg);
      for (const p of this.connections.values()) {
        if (p.conn.open) {
          try {
            p.conn.send(serialized);
          } catch (e) {
            console.warn('Failed broadcast to peer:', e);
          }
        }
      }
    } else if (this.guestConnection && this.guestConnection.open) {
      try {
        this.guestConnection.send(serializeMessage(msg));
      } catch (e) {
        console.warn('Failed send to host:', e);
      }
    }
  }

  public send(msg: NetworkMessage): boolean {
    this.broadcast(msg);
    return true;
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingIntervalId = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'PEER_PING',
          clientTime: Date.now(),
        });
      }
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  public disconnect(): void {
    this.stopPingLoop();

    if (this.guestConnection) {
      this.guestConnection.close();
      this.guestConnection = null;
    }

    for (const p of this.connections.values()) {
      p.conn.close();
    }
    this.connections.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
