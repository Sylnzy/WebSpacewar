export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinklePhase: number;
}

export class Starfield {
  private stars: Star[] = [];

  constructor(count: number = 140) {
    this.initStars(count);
  }

  private initStars(count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() < 0.85 ? 1.0 : Math.random() < 0.95 ? 1.8 : 2.5,
        speed: 0.005 + Math.random() * 0.015,
        brightness: 0.3 + Math.random() * 0.7,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  public update(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      star.twinklePhase += dt * 2.0;
      if (star.y > 1.0) {
        star.y = 0;
        star.x = Math.random();
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Deep cosmic space gradient
    const bgGradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      50,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    bgGradient.addColorStop(0, '#0a0d1a');
    bgGradient.addColorStop(0.6, '#05070e');
    bgGradient.addColorStop(1, '#020307');

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    for (const star of this.stars) {
      const alpha =
        star.brightness * (0.65 + 0.35 * Math.sin(star.twinklePhase));
      ctx.fillStyle = `rgba(220, 235, 255, ${alpha.toFixed(2)})`;

      const sx = star.x * width;
      const sy = star.y * height;

      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
