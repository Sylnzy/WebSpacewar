import { Peer, DataConnection } from 'peerjs';
import { NetworkMessage } from '../core/Types';
import {
  generateRoomCode,
  serializeMessage,
  deserializeMessage,
  calculatePing,
} from './Protocol';

export type Role = 'host' | 'guest';

export interface NetworkCallbacks {
  onConnected?: (peerId: string) => void;
  onDisconnected?: (reason?: string) => void;
  onMessage?: (msg: NetworkMessage) => void;
  onPingUpdate?: (pingMs: number) => void;
  onError?: (err: Error) => void;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
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
    return this.connection !== null && this.connection.open;
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
          this.handleIncomingConnection(conn);
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
          this.setupConnection(conn);

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

  private handleIncomingConnection(conn: DataConnection): void {
    if (this.connection && this.connection.open) {
      // Room already full for 2-player match
      conn.close();
      return;
    }
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection): void {
    this.connection = conn;

    conn.on('open', () => {
      this.callbacks.onConnected?.(conn.peer);
      this.startPingLoop();
    });

    conn.on('data', (raw: unknown) => {
      const msg = deserializeMessage(raw);
      if (!msg) return;

      if (msg.type === 'PEER_PING') {
        this.send({
          type: 'PEER_PONG',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        });
        return;
      }

      if (msg.type === 'PEER_PONG') {
        this.currentPing = calculatePing(msg.clientTime, Date.now());
        this.callbacks.onPingUpdate?.(this.currentPing);
        return;
      }

      this.callbacks.onMessage?.(msg);
    });

    conn.on('close', () => {
      this.stopPingLoop();
      this.connection = null;
      this.callbacks.onDisconnected?.('Peer closed connection');
    });

    conn.on('error', (err) => {
      this.callbacks.onError?.(new Error(`Connection error: ${err}`));
    });
  }

  public send(msg: NetworkMessage): boolean {
    if (!this.connection || !this.connection.open) {
      return false;
    }

    try {
      this.connection.send(serializeMessage(msg));
      return true;
    } catch (e) {
      console.warn('Failed to send network message:', e);
      return false;
    }
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

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
