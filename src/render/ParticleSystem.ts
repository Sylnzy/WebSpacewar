export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number = 600) {
    this.maxParticles = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        life: 0,
        maxLife: 1,
        color: '#ffffff',
      });
    }
  }

  private getFreeParticle(): Particle | null {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  public spawnExplosion(x: number, y: number, color: string, count: number = 25): void {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 1.5 + Math.random() * 3.0;
      p.maxLife = 0.35 + Math.random() * 0.45;
      p.life = p.maxLife;
      p.color = color;
    }
  }

  public spawnTrail(x: number, y: number, color: string): void {
    const p = this.getFreeParticle();
    if (!p) return;

    p.active = true;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 4;
    p.vx = (Math.random() - 0.5) * 15;
    p.vy = (Math.random() - 0.5) * 15;
    p.size = 1.2 + Math.random() * 1.5;
    p.maxLife = 0.25;
    p.life = p.maxLife;
    p.color = color;
  }

  public update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94; // slight drag
      p.vy *= 0.94;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.pool) {
      if (!p.active) continue;

      const progress = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, progress));
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
