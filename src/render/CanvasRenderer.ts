import { GameState, Planet, Fleet, PlanetOwner } from '../core/Types';
import { Starfield } from './Starfield';
import { ParticleSystem } from './ParticleSystem';
import { Camera } from './Camera';

export interface DragTargetVisual {
  fromPlanetIds: string[];
  toX: number;
  toY: number;
  targetPlanetId: string | null;
  ratio: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starfield: Starfield;
  public particles: ParticleSystem;
  public camera: Camera;

  private dpr: number = 1;
  private animTimer: number = 0;

  // Visual Theme Colors
  private colors: Record<PlanetOwner, { primary: string; glow: string; dark: string }> = {
    player1: {
      primary: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.6)',
      dark: '#032538',
    },
    player2: {
      primary: '#ff007f',
      glow: 'rgba(255, 0, 127, 0.6)',
      dark: '#3d0520',
    },
    player3: {
      primary: '#ffe600',
      glow: 'rgba(255, 230, 0, 0.6)',
      dark: '#3d3505',
    },
    player4: {
      primary: '#00ff66',
      glow: 'rgba(0, 255, 102, 0.6)',
      dark: '#033816',
    },
    player5: {
      primary: '#b84dff',
      glow: 'rgba(184, 77, 255, 0.6)',
      dark: '#2a083d',
    },
    neutral: {
      primary: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.3)',
      dark: '#1e242d',
    },
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context could not be acquired');
    }
    this.ctx = context;
    this.starfield = new Starfield();
    this.particles = new ParticleSystem();
    this.camera = new Camera();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);
  }

  public getWidth(): number {
    return this.canvas.width / this.dpr;
  }

  public getHeight(): number {
    return this.canvas.height / this.dpr;
  }

  public update(dt: number): void {
    this.animTimer += dt;
    this.starfield.update(dt);
    this.particles.update(dt);
  }

  public render(state: GameState, dragVisual?: DragTargetVisual | null): void {
    const width = this.getWidth();
    const height = this.getHeight();

    this.ctx.clearRect(0, 0, width, height);

    // 1. Starfield Background (fullscreen screen space)
    this.starfield.render(this.ctx, width, height);

    // Apply Camera Viewport Matrix for World Entities
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // 2. Aiming Laser & Drag Targets
    if (dragVisual && dragVisual.fromPlanetIds.length > 0) {
      this.renderAimingLasers(state, dragVisual);
    }

    // 3. Render Fleets
    for (const fleet of state.fleets) {
      this.renderFleet(fleet);
    }

    // 4. Render Planets
    for (const planet of state.planets) {
      const isSelected = state.selectedPlanetIds.includes(planet.id);
      this.renderPlanet(planet, isSelected);
    }

    // 5. Render Particle FX
    this.particles.render(this.ctx);

    this.ctx.restore();
  }

  private renderPlanet(planet: Planet, isSelected: boolean): void {
    const ctx = this.ctx;
    const theme = this.colors[planet.owner];

    ctx.save();

    // Subtle pulsing outer halo
    const pulseFactor = 1.0 + 0.08 * Math.sin(planet.pulsePhase);
    const glowRadius = planet.radius * 1.35 * pulseFactor;

    const haloGradient = ctx.createRadialGradient(
      planet.x,
      planet.y,
      planet.radius * 0.8,
      planet.x,
      planet.y,
      glowRadius
    );
    haloGradient.addColorStop(0, theme.glow);
    haloGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Planet Body Surface
    const bodyGradient = ctx.createRadialGradient(
      planet.x - planet.radius * 0.35,
      planet.y - planet.radius * 0.35,
      planet.radius * 0.1,
      planet.x,
      planet.y,
      planet.radius
    );
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.25, theme.primary);
    bodyGradient.addColorStop(0.85, theme.dark);
    bodyGradient.addColorStop(1, '#05070a');

    ctx.shadowBlur = isSelected ? 22 : 12;
    ctx.shadowColor = theme.primary;

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
    ctx.fill();

    // Orbit Ring Border
    ctx.lineWidth = isSelected ? 3.5 : 2.0;
    ctx.strokeStyle = isSelected ? '#ffea00' : theme.primary;
    ctx.stroke();

    // Selection Indicator: rotating dashed ring
    if (isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -this.animTimer * 20;
      ctx.stroke();
      ctx.restore();
    }

    // Units Count Label (Bold monospaced font)
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000000';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.max(13, Math.min(24, Math.round(planet.radius * 0.72)));
    ctx.font = `800 ${fontSize}px "JetBrains Mono", Consolas, monospace`;
    ctx.fillText(`${Math.floor(planet.units)}`, planet.x, planet.y);

    // Production rate indicator subscript (+2.5/s)
    if (planet.owner !== 'neutral') {
      ctx.font = `600 10px sans-serif`;
      ctx.fillStyle = theme.primary;
      ctx.fillText(`+${planet.productionRate}/s`, planet.x, planet.y + planet.radius + 14);
    }

    ctx.restore();
  }

  private renderFleet(fleet: Fleet): void {
    const ctx = this.ctx;
    const theme = this.colors[fleet.owner];

    // Spawn tiny neon trail particle
    this.particles.spawnTrail(fleet.x, fleet.y, theme.primary);

    ctx.save();

    // Calculate heading angle
    const angle = Math.atan2(fleet.targetY - fleet.y, fleet.targetX - fleet.x);

    ctx.translate(fleet.x, fleet.y);
    ctx.rotate(angle);

    // Ship shape: arrowhead neon triangle
    const shipSize = 7.5;
    ctx.beginPath();
    ctx.moveTo(shipSize, 0);
    ctx.lineTo(-shipSize * 0.75, -shipSize * 0.6);
    ctx.lineTo(-shipSize * 0.35, 0);
    ctx.lineTo(-shipSize * 0.75, shipSize * 0.6);
    ctx.closePath();

    ctx.fillStyle = theme.primary;
    ctx.shadowBlur = 10;
    ctx.shadowColor = theme.primary;
    ctx.fill();

    ctx.restore();

    // Unit count bubble above fleet swarm
    ctx.save();
    ctx.font = `700 11px "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000000';
    ctx.fillText(`${fleet.units}`, fleet.x, fleet.y - 8);
    ctx.restore();
  }

  private renderAimingLasers(state: GameState, drag: DragTargetVisual): void {
    const ctx = this.ctx;

    for (const fromId of drag.fromPlanetIds) {
      const source = state.planets.find((p) => p.id === fromId);
      if (!source) continue;

      const theme = this.colors[source.owner];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(drag.toX, drag.toY);

      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -this.animTimer * 30;
      ctx.shadowBlur = 12;
      ctx.shadowColor = theme.primary;
      ctx.stroke();

      // Estimated send count badge (counter-scaled so it stays visible on small screens & zoom-out)
      const unitsToSend = Math.floor(source.units * drag.ratio);
      if (unitsToSend > 0) {
        const midX = (source.x + drag.toX) / 2;
        const midY = (source.y + drag.toY) / 2;

        const invZoom = 1 / Math.max(0.2, this.camera.zoom);
        const radius = Math.max(13, 14 * invZoom);
        const fontSize = Math.max(11, Math.round(11 * invZoom));

        ctx.fillStyle = 'rgba(5, 10, 20, 0.9)';
        ctx.beginPath();
        ctx.arc(midX, midY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = Math.max(1.5, 1.8 * invZoom);
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${unitsToSend}`, midX, midY);
      }

      ctx.restore();
    }
  }
}
