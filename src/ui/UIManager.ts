import { GameState, PlanetOwner } from '../core/Types';
import { AIDifficulty } from '../ai/BotAI';

export interface UICallbacks {
  onStartSolo: (diff: AIDifficulty, playerCount: number) => void;
  onHostGame: () => void;
  onJoinGame: (code: string) => void;
  onRatioSelect: (ratio: number) => void;
  onSelectAll: () => void;
  onToggleMute: () => boolean;
  onSurrender: () => void;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private currentRatio: number = 0.5;
  private selectedDifficulty: AIDifficulty = 'medium';
  private selectedPlayerCount: number = 2;
  private menuCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  private clearMenuCleanup(): void {
    if (this.menuCleanup) {
      this.menuCleanup();
      this.menuCleanup = null;
    }
  }

  public showMainMenu(): void {
    this.clearMenuCleanup();

    this.container.innerHTML = `
      <div class="main-menu-container">
        <div class="main-menu-wrapper">
          <!-- Character Column: Floating Cyber Cosmonaut -->
          <div class="astronaut-hero-card" id="astronaut-hero">
            <div class="astronaut-character-wrap">
              <div class="cosmic-orbit-ring"></div>
              <div class="astronaut-float-box" id="astronaut-float-box">
                <svg class="astronaut-svg" viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#ffd000" />
                      <stop offset="45%" stop-color="#ff7700" />
                      <stop offset="70%" stop-color="#00f0ff" />
                      <stop offset="100%" stop-color="#0b1b3d" />
                    </linearGradient>
                    <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#f8fafc" />
                      <stop offset="60%" stop-color="#cbd5e1" />
                      <stop offset="100%" stop-color="#64748b" />
                    </linearGradient>
                    <linearGradient id="suitDark" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#334155" />
                      <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                    <radialGradient id="thrusterGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="#00f0ff" stop-opacity="1" />
                      <stop offset="60%" stop-color="#00f0ff" stop-opacity="0.4" />
                      <stop offset="100%" stop-color="#00f0ff" stop-opacity="0" />
                    </radialGradient>
                    <radialGradient id="helmetGlare" cx="35%" cy="30%" r="50%">
                      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8" />
                      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.1" />
                      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                    </radialGradient>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <!-- Jetpack backpack -->
                  <g class="astro-backpack">
                    <rect x="70" y="85" width="100" height="95" rx="16" fill="url(#suitDark)" stroke="#475569" stroke-width="2"/>
                    <rect x="76" y="92" width="22" height="70" rx="10" fill="#1e293b" stroke="#00f0ff" stroke-width="1.5"/>
                    <rect x="142" y="92" width="22" height="70" rx="10" fill="#1e293b" stroke="#ff007f" stroke-width="1.5"/>
                    <polygon points="80,180 94,180 98,198 76,198" fill="#334155"/>
                    <polygon points="146,180 160,180 164,198 142,198" fill="#334155"/>
                    <ellipse class="thruster-flame flame-left" cx="87" cy="208" rx="8" ry="16" fill="url(#thrusterGlow)" filter="url(#neonGlow)"/>
                    <ellipse class="thruster-flame flame-right" cx="153" cy="208" rx="8" ry="16" fill="url(#thrusterGlow)" filter="url(#neonGlow)"/>
                  </g>

                  <!-- Left Leg & Boot -->
                  <g class="astro-leg-left">
                    <path d="M92 170 Q80 205 75 235" stroke="url(#suitGrad)" stroke-width="20" stroke-linecap="round" fill="none"/>
                    <ellipse cx="73" cy="238" rx="14" ry="10" fill="url(#suitDark)" stroke="#00f0ff" stroke-width="2"/>
                  </g>

                  <!-- Right Leg & Boot -->
                  <g class="astro-leg-right">
                    <path d="M148 170 Q160 200 168 230" stroke="url(#suitGrad)" stroke-width="20" stroke-linecap="round" fill="none"/>
                    <ellipse cx="170" cy="234" rx="14" ry="10" fill="url(#suitDark)" stroke="#ff007f" stroke-width="2"/>
                  </g>

                  <!-- Suit Torso -->
                  <g class="astro-body">
                    <ellipse cx="120" cy="142" rx="42" ry="46" fill="url(#suitGrad)" stroke="#475569" stroke-width="2"/>
                    <rect x="100" y="125" width="40" height="34" rx="6" fill="#0f172a" stroke="#00f0ff" stroke-width="1.5"/>
                    <circle class="led-dot led-cyan" cx="109" cy="134" r="3" fill="#00f0ff"/>
                    <circle class="led-dot led-magenta" cx="120" cy="134" r="3" fill="#ff007f"/>
                    <circle class="led-dot led-yellow" cx="131" cy="134" r="3" fill="#ffe600"/>
                    <rect x="106" y="144" width="28" height="6" rx="3" fill="#1e293b"/>
                    <rect x="106" y="144" width="20" height="6" rx="3" fill="#00f0ff"/>
                    <polygon points="120,112 124,118 116,118" fill="#ff007f"/>
                  </g>

                  <!-- Left Arm -->
                  <g class="astro-arm-left">
                    <path d="M82 120 Q50 135 45 160" stroke="url(#suitGrad)" stroke-width="15" stroke-linecap="round" fill="none"/>
                    <circle cx="43" cy="164" r="9" fill="url(#suitDark)" stroke="#00f0ff" stroke-width="1.5"/>
                  </g>

                  <!-- Right Arm -->
                  <g class="astro-arm-right">
                    <path d="M158 120 Q185 110 196 90" stroke="url(#suitGrad)" stroke-width="15" stroke-linecap="round" fill="none"/>
                    <circle cx="198" cy="86" r="9" fill="url(#suitDark)" stroke="#ff007f" stroke-width="1.5"/>
                  </g>

                  <!-- Helmet & Visor -->
                  <g class="astro-helmet">
                    <ellipse cx="120" cy="98" rx="36" ry="8" fill="#334155" stroke="#64748b" stroke-width="2"/>
                    <circle cx="120" cy="70" r="46" fill="url(#suitGrad)" stroke="#475569" stroke-width="2.5"/>
                    <ellipse cx="120" cy="70" rx="35" ry="28" fill="#0a0f1d" stroke="#00f0ff" stroke-width="2"/>
                    <ellipse class="astro-visor-reflect" cx="120" cy="70" rx="33" ry="26" fill="url(#visorGrad)"/>
                    <ellipse cx="108" cy="58" rx="18" ry="10" transform="rotate(-15 108 58)" fill="url(#helmetGlare)"/>
                    <line x1="78" y1="58" x2="64" y2="42" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
                    <circle class="antenna-beacon" cx="62" cy="40" r="4" fill="#ff007f" filter="url(#neonGlow)"/>
                  </g>
                </svg>
              </div>
            </div>
            <div class="astronaut-status-badge">
              <span class="status-pulse-dot"></span>
              <span class="status-label">COMMANDER // ONLINE</span>
            </div>
            <div class="astronaut-subtext">Sistem Navigasi Orbit Aktif</div>
          </div>

          <!-- Main Menu Panel -->
          <div class="glass-panel main-menu-panel">
            <div class="header-badge-row">
              <span class="cyber-tag">EXPEDITION 2026</span>
              <span class="version-tag">v1.0.0</span>
            </div>
            <h1 class="game-title">SPACE CONQUEST</h1>
            <p class="game-subtitle">Taktik Galaksi Real-Time RTS</p>

            <!-- Mode Solo vs AI -->
            <div class="menu-section cyber-section">
              <div class="section-header">
                <span class="section-icon">⚔️</span>
                <div class="section-title">Mode Solo vs AI</div>
              </div>

              <div class="section-sublabel">Jumlah Faksi (Free-For-All)</div>
              <div class="btn-group count-selector" style="margin-bottom: 12px;">
                <button class="btn count-btn ${this.selectedPlayerCount === 2 ? 'active' : ''}" id="btn-count-2">2 (1v1)</button>
                <button class="btn count-btn ${this.selectedPlayerCount === 3 ? 'active' : ''}" id="btn-count-3">3 Faksi</button>
                <button class="btn count-btn ${this.selectedPlayerCount === 4 ? 'active' : ''}" id="btn-count-4">4 Faksi</button>
                <button class="btn count-btn ${this.selectedPlayerCount === 5 ? 'active' : ''}" id="btn-count-5">5 Faksi</button>
              </div>

              <div class="section-sublabel">Tingkat Kesulitan AI</div>
              <div class="btn-group diff-selector" style="margin-bottom: 14px;">
                <button class="btn diff-btn ${this.selectedDifficulty === 'easy' ? 'active' : ''}" id="btn-diff-easy">Easy</button>
                <button class="btn diff-btn ${this.selectedDifficulty === 'medium' ? 'active' : ''}" id="btn-diff-med">Medium</button>
                <button class="btn diff-btn ${this.selectedDifficulty === 'hard' ? 'active' : ''}" id="btn-diff-hard">Hard</button>
              </div>
              <button class="btn btn-cyan btn-glow" id="btn-start-solo" style="width: 100%;">Mulai Pertempuran Galaksi</button>
            </div>

            <!-- Mode Multiplayer P2P -->
            <div class="menu-section cyber-section">
              <div class="section-header">
                <span class="section-icon">📡</span>
                <div class="section-title">Multiplayer Online (WebRTC P2P)</div>
              </div>
              <button class="btn btn-magenta btn-glow" id="btn-host-game" style="width: 100%; margin-bottom: 10px;">Host Buat Room</button>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="input-room-code" class="input-box cyber-input" placeholder="SP-XXXX" maxlength="10" />
                <button class="btn btn-cyan btn-glow" id="btn-join-game" style="flex-shrink: 0;">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Interactive mouse parallax for astronaut
    const astroFloatBox = document.getElementById('astronaut-float-box');
    if (astroFloatBox) {
      const handleMouseMove = (e: MouseEvent) => {
        const { innerWidth, innerHeight } = window;
        const normX = (e.clientX / innerWidth - 0.5) * 2;
        const normY = (e.clientY / innerHeight - 0.5) * 2;
        astroFloatBox.style.transform = `translate3d(${normX * 10}px, ${normY * 10}px, 0) rotateY(${normX * 12}deg) rotateX(${-normY * 10}deg)`;
      };

      window.addEventListener('mousemove', handleMouseMove);
      this.menuCleanup = () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }

    // Bind difficulty selection
    const diffButtons: Record<AIDifficulty, HTMLElement | null> = {
      easy: document.getElementById('btn-diff-easy'),
      medium: document.getElementById('btn-diff-med'),
      hard: document.getElementById('btn-diff-hard'),
    };

    const setDiff = (d: AIDifficulty) => {
      this.selectedDifficulty = d;
      Object.entries(diffButtons).forEach(([key, btn]) => {
        if (btn) btn.className = `btn ${key === d ? 'active' : ''}`;
      });
    };

    // Bind player count selection
    const countButtons: Record<number, HTMLElement | null> = {
      2: document.getElementById('btn-count-2'),
      3: document.getElementById('btn-count-3'),
      4: document.getElementById('btn-count-4'),
      5: document.getElementById('btn-count-5'),
    };

    const setCount = (c: number) => {
      this.selectedPlayerCount = c;
      Object.entries(countButtons).forEach(([key, btn]) => {
        if (btn) btn.className = `btn count-btn ${parseInt(key) === c ? 'active' : ''}`;
      });
    };

    [2, 3, 4, 5].forEach((c) => {
      countButtons[c]?.addEventListener('click', () => setCount(c));
    });

    diffButtons.easy?.addEventListener('click', () => setDiff('easy'));
    diffButtons.medium?.addEventListener('click', () => setDiff('medium'));
    diffButtons.hard?.addEventListener('click', () => setDiff('hard'));

    document.getElementById('btn-start-solo')?.addEventListener('click', () => {
      this.callbacks.onStartSolo(this.selectedDifficulty, this.selectedPlayerCount);
    });

    document.getElementById('btn-host-game')?.addEventListener('click', () => {
      this.callbacks.onHostGame();
    });

    document.getElementById('btn-join-game')?.addEventListener('click', () => {
      const codeInput = document.getElementById('input-room-code') as HTMLInputElement;
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
      if (code) {
        this.callbacks.onJoinGame(code);
      }
    });
  }

  public showLobbyHost(roomCode: string): void {
    this.clearMenuCleanup();
    this.container.innerHTML = `
      <div class="glass-panel screen-modal">
        <h2 class="game-title" style="font-size: 26px;">ROOM MULTIPLAYER</h2>
        <p class="game-subtitle">Bagikan kode berikut ke lawan Anda</p>

        <div class="code-pill" id="copy-code-btn" title="Klik untuk menyalin">
          <span>${roomCode}</span>
          <span style="font-size: 13px; opacity: 0.8;">📋 Salin</span>
        </div>

        <p id="copy-feedback" style="font-size: 12px; color: var(--cyan); height: 16px; margin-bottom: 16px;"></p>

        <div class="hud-badge" style="display: inline-block; margin-bottom: 20px;">
          ⏳ Menunggu Pemain 2 Terhubung...
        </div>

        <div>
          <button class="btn" id="btn-cancel-lobby">Batal</button>
        </div>
      </div>
    `;

    document.getElementById('copy-code-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(roomCode);
      const feedback = document.getElementById('copy-feedback');
      if (feedback) feedback.textContent = 'Kode disalin ke clipboard!';
    });

    document.getElementById('btn-cancel-lobby')?.addEventListener('click', () => {
      this.callbacks.onBackToMenu();
    });
  }

  public showLobbyGuest(): void {
    this.clearMenuCleanup();
    this.container.innerHTML = `
      <div class="glass-panel screen-modal">
        <h2 class="game-title" style="font-size: 26px;">MENGHUBUNGKAN...</h2>
        <p class="game-subtitle">Menghubungkan ke WebRTC Host...</p>
        <div class="hud-badge" style="display: inline-block; margin: 16px 0;">
          🔄 Mengirim Handshake P2P...
        </div>
        <div>
          <button class="btn" id="btn-cancel-guest">Batal</button>
        </div>
      </div>
    `;

    document.getElementById('btn-cancel-guest')?.addEventListener('click', () => {
      this.callbacks.onBackToMenu();
    });
  }

  public showHUD(isMultiplayer: boolean = false, playerRole: PlanetOwner = 'player1'): void {
    this.clearMenuCleanup();
    this.container.innerHTML = `
      <div id="hud-top">
        <div class="hud-badge" id="hud-player-badge">
          ${playerRole === 'player1' ? '🔷 ANDA: CYAN' : '🔴 ANDA: MAGENTA'}
        </div>

        <div class="dominance-container" id="dominance-container" title="Dominasi Galaksi">
          <div class="dominance-segment dom-p1" id="dom-p1" style="width: 20%;"></div>
          <div class="dominance-segment dom-p2" id="dom-p2" style="width: 20%;"></div>
          <div class="dominance-segment dom-p3" id="dom-p3" style="width: 20%;"></div>
          <div class="dominance-segment dom-p4" id="dom-p4" style="width: 20%;"></div>
          <div class="dominance-segment dom-p5" id="dom-p5" style="width: 20%;"></div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="hud-badge" id="hud-ping-badge">
            ${isMultiplayer ? 'P2P: -- ms' : 'SOLO AI'}
          </div>
          <button class="btn" id="btn-mute" style="padding: 6px 10px; font-size: 16px;">🔊</button>
        </div>
      </div>

      <div id="hud-bottom">
        <div class="ratio-selector">
          <button class="btn ratio-btn ${this.currentRatio === 0.25 ? 'active' : ''}" data-ratio="0.25">25%</button>
          <button class="btn ratio-btn ${this.currentRatio === 0.50 ? 'active' : ''}" data-ratio="0.50">50%</button>
          <button class="btn ratio-btn ${this.currentRatio === 0.75 ? 'active' : ''}" data-ratio="0.75">75%</button>
          <button class="btn ratio-btn ${this.currentRatio === 1.00 ? 'active' : ''}" data-ratio="1.00">100%</button>
        </div>
        <button class="btn" id="btn-select-all" title="Pilih Semua Planet (A)">Pilih Semua</button>
        <button class="btn" id="btn-surrender" style="background: rgba(255, 0, 0, 0.2); border-color: #ff3344;">Menyerah</button>
      </div>
    `;

    // Bind ratio buttons
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    ratioBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const ratio = parseFloat(target.dataset.ratio || '0.5');
        this.setRatio(ratio);
        this.callbacks.onRatioSelect(ratio);
      });
    });

    document.getElementById('btn-select-all')?.addEventListener('click', () => {
      this.callbacks.onSelectAll();
    });

    document.getElementById('btn-mute')?.addEventListener('click', (e) => {
      const isMuted = this.callbacks.onToggleMute();
      (e.currentTarget as HTMLElement).textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-surrender')?.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menyerah?')) {
        this.callbacks.onSurrender();
      }
    });
  }

  public setRatio(ratio: number): void {
    this.currentRatio = ratio;
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    ratioBtns.forEach((btn) => {
      const btnRatio = parseFloat((btn as HTMLElement).dataset.ratio || '0.5');
      if (Math.abs(btnRatio - ratio) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public updateHUD(state: GameState, pingMs?: number): void {
    const factions: PlanetOwner[] = ['player1', 'player2', 'player3', 'player4', 'player5'];
    const counts: Record<PlanetOwner, number> = {
      player1: 0,
      player2: 0,
      player3: 0,
      player4: 0,
      player5: 0,
      neutral: 0,
    };

    for (const p of state.planets) {
      counts[p.owner] += p.units;
    }
    for (const f of state.fleets) {
      counts[f.owner] += f.units;
    }

    const total = factions.reduce((acc, f) => acc + counts[f], 0);

    factions.forEach((f, idx) => {
      const segEl = document.getElementById(`dom-p${idx + 1}`);
      if (segEl) {
        const pct = total > 0 ? (counts[f] / total) * 100 : 0;
        segEl.style.width = `${pct.toFixed(1)}%`;
      }
    });

    if (pingMs !== undefined) {
      const pingBadge = document.getElementById('hud-ping-badge');
      if (pingBadge) {
        pingBadge.textContent = `P2P: ${pingMs} ms`;
      }
    }
  }

  public showGameOver(
    winner: PlanetOwner,
    playerRole: PlanetOwner,
    stats: { duration: number; deployed: number; captured: number }
  ): void {
    const isVictory = winner === playerRole;
    const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    };

    const factionNames: Record<PlanetOwner, string> = {
      player1: 'CYAN (PLAYER 1)',
      player2: 'MAGENTA (BOT 1)',
      player3: 'GOLD (BOT 2)',
      player4: 'EMERALD (BOT 3)',
      player5: 'PURPLE (BOT 4)',
      neutral: 'NEUTRAL',
    };
    const winnerName = factionNames[winner] || winner.toUpperCase();

    const modal = document.createElement('div');
    modal.className = 'glass-panel screen-modal';
    modal.innerHTML = `
      <div class="result-header ${isVictory ? 'result-victory' : 'result-defeat'}">
        ${isVictory ? '🏆 KEMENANGAN TOTAL!' : `💥 GALAKSI DIKUASAI ${winnerName}!`}
      </div>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 18px;">
        ${isVictory ? 'Anda berhasil menaklukkan seluruh faksi galaksi.' : `Armada Anda telah ditaklukkan oleh faksi ${winnerName}.`}
      </p>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${formatTime(stats.duration)}</div>
          <div class="stat-label">Durasi Pertempuran</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.deployed}</div>
          <div class="stat-label">Pasukan Dikerahkan</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.captured}</div>
          <div class="stat-label">Planet Direbut</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${isVictory ? '100%' : '0%'}</div>
          <div class="stat-label">Dominasi Akhir</div>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-cyan" id="btn-play-again">Main Lagi</button>
        <button class="btn" id="btn-gameover-menu">Menu Utama</button>
      </div>
    `;

    this.container.appendChild(modal);

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.callbacks.onPlayAgain();
    });

    document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
      this.callbacks.onBackToMenu();
    });
  }
}
