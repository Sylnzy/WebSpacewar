import { GameEngine } from './core/GameEngine';
import { generateMap } from './core/MapGenerator';
import { CanvasRenderer } from './render/CanvasRenderer';
import { InputController } from './input/InputController';
import { soundManager } from './audio/SoundManager';
import { BotAI, AIDifficulty } from './ai/BotAI';
import { NetworkManager } from './net/NetworkManager';
import { UIManager } from './ui/UIManager';
import { PlanetOwner, GameState } from './core/Types';

type GameMode = 'menu' | 'solo' | 'multiplayer-host' | 'multiplayer-guest';

class GameApp {
  private canvas: HTMLCanvasElement;
  private uiContainer: HTMLElement;
  private renderer: CanvasRenderer;
  private engine: GameEngine;
  private input: InputController;
  private network: NetworkManager;
  private ui: UIManager;
  private bots: BotAI[] = [];
  private currentPlayerCount: number = 2;

  private mode: GameMode = 'menu';
  private playerRole: PlanetOwner = 'player1';
  private lastTime: number = performance.now();
  private snapshotTimer: number = 0;
  private currentDifficulty: AIDifficulty = 'medium';

  private stats = {
    duration: 0,
    deployed: 0,
    captured: 0,
  };

  constructor() {
    const canvasEl = document.getElementById('game-canvas') as HTMLCanvasElement;
    const uiEl = document.getElementById('ui-container') as HTMLElement;

    if (!canvasEl || !uiEl) {
      throw new Error('Canvas or UI container missing from DOM');
    }

    this.canvas = canvasEl;
    this.uiContainer = uiEl;

    this.renderer = new CanvasRenderer(this.canvas);
    this.engine = new GameEngine([]);

    this.network = new NetworkManager({
      onConnected: () => this.handleNetworkConnected(),
      onDisconnected: (reason) => this.handleNetworkDisconnected(reason),
      onMessage: (msg) => this.handleNetworkMessage(msg),
      onError: (err) => console.error('Network error:', err),
    });

    this.ui = new UIManager(this.uiContainer, {
      onStartSolo: (diff, count) => this.startSoloGame(diff, count),
      onHostGame: () => this.startHostLobby(),
      onJoinGame: (code) => this.joinLobby(code),
      onRatioSelect: (ratio) => {
        this.engine.setSendRatio(ratio);
      },
      onSelectAll: () => {
        this.engine.selectAllPlanets(this.playerRole);
      },
      onToggleMute: () => soundManager.toggleMute(),
      onSurrender: () => this.surrender(),
      onPlayAgain: () => this.restartGame(),
      onBackToMenu: () => this.returnToMenu(),
    });

    this.input = new InputController(
      this.canvas,
      () => this.engine.getState(),
      this.playerRole,
      {
        onDispatch: (fromIds, toId, ratio) => this.handleDispatch(fromIds, toId, ratio),
        onRatioChange: (ratio) => {
          this.engine.setSendRatio(ratio);
          this.ui.setRatio(ratio);
        },
        onSelectPlanet: (id, multi) => {
          this.engine.toggleSelectPlanet(id, multi);
          soundManager.playSelect();
        },
        onSelectAll: () => {
          this.engine.selectAllPlanets(this.playerRole);
          soundManager.playSelect();
        },
        onClearSelection: () => {
          this.engine.clearSelection();
        },
      }
    );

    this.setupEngineHooks();
    this.ui.showMainMenu();

    // Start requestAnimationFrame loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private setupEngineHooks(): void {
    const factionColors: Record<PlanetOwner, string> = {
      player1: '#00f0ff',
      player2: '#ff007f',
      player3: '#ffe600',
      player4: '#00ff66',
      player5: '#b84dff',
      neutral: '#94a3b8',
    };

    this.engine.onCombatResult = (result, planet) => {
      if (result.conquered) {
        soundManager.playCapture();
        const color = factionColors[result.newOwner] || '#ffffff';
        this.renderer.particles.spawnExplosion(planet.x, planet.y, color, 30);
        if (result.newOwner === this.playerRole) {
          this.stats.captured++;
        }
      } else if (!result.friendly) {
        soundManager.playCombat();
        this.renderer.particles.spawnExplosion(planet.x, planet.y, '#ffffff', 12);
      }
    };

    this.engine.onGameOver = (winner) => {
      this.stats.duration = this.engine.getState().elapsedTime;
      if (winner === this.playerRole) {
        soundManager.playVictory();
      } else {
        soundManager.playDefeat();
      }
      this.ui.showGameOver(winner, this.playerRole, this.stats);
    };
  }

  private resetStats(): void {
    this.stats = {
      duration: 0,
      deployed: 0,
      captured: 0,
    };
  }

  public startSoloGame(diff: AIDifficulty, playerCount: number = 2): void {
    soundManager.init();
    this.mode = 'solo';
    this.playerRole = 'player1';
    this.currentDifficulty = diff;
    this.currentPlayerCount = playerCount;
    this.input.setPlayerOwner('player1');
    this.resetStats();

    const width = this.renderer.getWidth();
    const height = this.renderer.getHeight();
    const totalPlanets = 10 + (playerCount - 2) * 3;
    const planets = generateMap(width, height, totalPlanets, Date.now(), playerCount);

    this.engine = new GameEngine(planets);
    this.setupEngineHooks();

    this.bots = [];
    const botOwners: PlanetOwner[] = ['player2', 'player3', 'player4', 'player5'];
    for (let i = 1; i < playerCount; i++) {
      this.bots.push(new BotAI(botOwners[i - 1], diff));
    }

    this.engine.start();
    this.ui.showHUD(false, 'player1');
  }

  public async startHostLobby(): Promise<void> {
    soundManager.init();
    this.mode = 'multiplayer-host';
    this.playerRole = 'player1';
    this.input.setPlayerOwner('player1');
    this.resetStats();

    try {
      const roomCode = await this.network.createRoom();
      this.ui.showLobbyHost(roomCode);
    } catch (e) {
      alert(`Gagal membuat room P2P: ${e}`);
      this.returnToMenu();
    }
  }

  public async joinLobby(code: string): Promise<void> {
    soundManager.init();
    this.mode = 'multiplayer-guest';
    this.playerRole = 'player2';
    this.input.setPlayerOwner('player2');
    this.resetStats();
    this.ui.showLobbyGuest();

    try {
      await this.network.joinRoom(code);
    } catch (e) {
      alert(`Gagal terhubung ke room: ${e}`);
      this.returnToMenu();
    }
  }

  private handleNetworkConnected(): void {
    if (this.mode === 'multiplayer-host') {
      // Host generates initial map and launches game
      const width = this.renderer.getWidth();
      const height = this.renderer.getHeight();
      const seed = Date.now();
      const planets = generateMap(width, height, 11, seed);

      this.engine = new GameEngine(planets);
      this.setupEngineHooks();
      this.engine.start();

      this.network.send({
        type: 'GAME_START',
        seed,
        planets,
      });

      this.ui.showHUD(true, 'player1');
    }
  }

  private handleNetworkMessage(msg: unknown): void {
    const netMsg = msg as { type: string; [key: string]: unknown };

    if (netMsg.type === 'GAME_START') {
      const planets = netMsg.planets as GameState['planets'];
      this.engine = new GameEngine(planets);
      this.setupEngineHooks();
      this.engine.start();
      this.ui.showHUD(true, 'player2');
    } else if (netMsg.type === 'COMMAND_DISPATCH') {
      // Host receives guest command
      if (this.mode === 'multiplayer-host') {
        const fromPlanetIds = netMsg.fromPlanetIds as string[];
        const toPlanetId = netMsg.toPlanetId as string;
        const ratio = netMsg.ratio as number;

        this.engine.dispatchFleet(fromPlanetIds, toPlanetId, ratio, 'player2');
        soundManager.playDispatch();
      }
    } else if (netMsg.type === 'STATE_SNAPSHOT') {
      // Guest updates its state from Host snapshot
      if (this.mode === 'multiplayer-guest') {
        const snapshot = netMsg.state as GameState;
        this.engine.setState(snapshot);
      }
    } else if (netMsg.type === 'PLAYER_SURRENDER') {
      const surrenderingPlayer = netMsg.owner as PlanetOwner;
      const winner = surrenderingPlayer === 'player1' ? 'player2' : 'player1';
      this.engine.getState().winner = winner;
      this.engine.getState().status = 'ended';
      this.engine.onGameOver?.(winner);
    }
  }

  private handleNetworkDisconnected(reason?: string): void {
    if (this.mode === 'multiplayer-host' || this.mode === 'multiplayer-guest') {
      alert(`Koneksi terputus: ${reason || 'Lawan keluar'}. Mengalihkan pertandingan ke Bot AI.`);
      this.mode = 'solo';
      this.bots = [new BotAI(this.playerRole === 'player1' ? 'player2' : 'player1', 'medium')];
      this.ui.showHUD(false, this.playerRole);
    }
  }

  private handleDispatch(fromPlanetIds: string[], toPlanetId: string, ratio: number): void {
    if (this.engine.getState().status !== 'running') return;

    if (this.mode === 'solo' || this.mode === 'multiplayer-host') {
      const dispatched = this.engine.dispatchFleet(
        fromPlanetIds,
        toPlanetId,
        ratio,
        this.playerRole
      );
      if (dispatched) {
        soundManager.playDispatch();
        this.stats.deployed++;
      }
    } else if (this.mode === 'multiplayer-guest') {
      // Guest sends command to Host
      this.network.send({
        type: 'COMMAND_DISPATCH',
        fromPlanetIds,
        toPlanetId,
        ratio,
        timestamp: Date.now(),
      });
      soundManager.playDispatch();
      this.stats.deployed++;
    }
  }

  private surrender(): void {
    if (this.mode === 'solo') {
      this.engine.getState().winner = 'player2';
      this.engine.getState().status = 'ended';
      this.engine.onGameOver?.('player2');
    } else {
      this.network.send({
        type: 'PLAYER_SURRENDER',
        owner: this.playerRole,
      });
      const winner = this.playerRole === 'player1' ? 'player2' : 'player1';
      this.engine.getState().winner = winner;
      this.engine.getState().status = 'ended';
      this.engine.onGameOver?.(winner);
    }
  }

  private restartGame(): void {
    if (this.mode === 'solo') {
      this.startSoloGame(this.currentDifficulty, this.currentPlayerCount);
    } else {
      this.returnToMenu();
    }
  }

  private returnToMenu(): void {
    this.mode = 'menu';
    this.network.disconnect();
    this.bots = [];
    this.engine.clearSelection();
    this.ui.showMainMenu();
  }

  private loop(timestamp: number): void {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.mode === 'solo') {
      // Host authoritative simulation & Multi-Bot AI
      this.engine.update(dt);
      for (const bot of this.bots) {
        const action = bot.update(dt, this.engine.getState());
        if (action) {
          const sent = this.engine.dispatchFleet(
            action.fromPlanetIds,
            action.toPlanetId,
            action.ratio,
            bot.getOwner()
          );
          if (sent) soundManager.playDispatch();
        }
      }
      this.ui.updateHUD(this.engine.getState());
    } else if (this.mode === 'multiplayer-host') {
      // Host simulation & snapshot broadcast
      this.engine.update(dt);

      this.snapshotTimer += dt;
      if (this.snapshotTimer >= 0.05) { // 20Hz snapshots
        this.snapshotTimer = 0;
        this.network.send({
          type: 'STATE_SNAPSHOT',
          state: this.engine.getState(),
          timestamp: Date.now(),
        });
      }

      this.ui.updateHUD(this.engine.getState(), this.network.getPing());
    } else if (this.mode === 'multiplayer-guest') {
      // Guest updates HUD from synced state
      this.ui.updateHUD(this.engine.getState(), this.network.getPing());
    }

    // Render 60 FPS Canvas & Particles
    this.renderer.update(dt);
    this.renderer.render(this.engine.getState(), this.input.getDragVisual());

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Initialize application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
