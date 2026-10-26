export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;

  public minZoom: number = 0.25;
  public maxZoom: number = 3.0;

  constructor(x: number = 0, y: number = 0, zoom: number = 1) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom,
    };
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom + this.x,
      y: worldY * this.zoom + this.y,
    };
  }

  public pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  public zoomAt(screenX: number, screenY: number, factor: number): void {
    const oldZoom = this.zoom;
    const targetZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));

    if (targetZoom === oldZoom) return;

    const worldX = (screenX - this.x) / oldZoom;
    const worldY = (screenY - this.y) / oldZoom;

    this.zoom = targetZoom;
    this.x = screenX - worldX * targetZoom;
    this.y = screenY - worldY * targetZoom;
  }

  public fitToBounds(
    viewWidth: number,
    viewHeight: number,
    bounds: ViewportBounds,
    padding: number = 40
  ): void {
    const boundW = Math.max(1, bounds.maxX - bounds.minX);
    const boundH = Math.max(1, bounds.maxY - bounds.minY);

    const availableW = Math.max(10, viewWidth - padding * 2);
    const availableH = Math.max(10, viewHeight - padding * 2);

    const scaleX = availableW / boundW;
    const scaleY = availableH / boundH;

    const targetZoom = Math.min(this.maxZoom, Math.max(this.minZoom, Math.min(scaleX, scaleY)));
    this.zoom = targetZoom;

    const centerWorldX = (bounds.minX + bounds.maxX) / 2;
    const centerWorldY = (bounds.minY + bounds.maxY) / 2;

    this.x = viewWidth / 2 - centerWorldX * targetZoom;
    this.y = viewHeight / 2 - centerWorldY * targetZoom;
  }

  public fitToPlanets(
    viewWidth: number,
    viewHeight: number,
    planets: { x: number; y: number; radius: number }[],
    padding: number = 50
  ): void {
    if (planets.length === 0) {
      this.reset(viewWidth, viewHeight);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of planets) {
      minX = Math.min(minX, p.x - p.radius);
      minY = Math.min(minY, p.y - p.radius);
      maxX = Math.max(maxX, p.x + p.radius);
      maxY = Math.max(maxY, p.y + p.radius);
    }

    this.fitToBounds(viewWidth, viewHeight, { minX, minY, maxX, maxY }, padding);
  }

  public reset(viewWidth: number, viewHeight: number, worldWidth: number = 1400, worldHeight: number = 900): void {
    this.fitToBounds(viewWidth, viewHeight, {
      minX: 0,
      minY: 0,
      maxX: worldWidth,
      maxY: worldHeight,
    });
  }
}
