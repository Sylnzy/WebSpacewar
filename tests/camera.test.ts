import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '../src/render/Camera';

describe('Camera Viewport & Transform', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera();
  });

  it('initializes with default values', () => {
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
    expect(camera.zoom).toBe(1);
  });

  it('converts screen to world coordinates correctly', () => {
    camera.x = 100;
    camera.y = 50;
    camera.zoom = 2;

    const world = camera.screenToWorld(200, 150);
    expect(world.x).toBe((200 - 100) / 2);
    expect(world.y).toBe((150 - 50) / 2);
  });

  it('converts world to screen coordinates correctly', () => {
    camera.x = 100;
    camera.y = 50;
    camera.zoom = 2;

    const screen = camera.worldToScreen(50, 50);
    expect(screen.x).toBe(50 * 2 + 100);
    expect(screen.y).toBe(50 * 2 + 50);
  });

  it('pans camera correctly', () => {
    camera.pan(25, -15);
    expect(camera.x).toBe(25);
    expect(camera.y).toBe(-15);
  });

  it('clamps zoom within bounds', () => {
    camera.zoomAt(0, 0, 100);
    expect(camera.zoom).toBeLessThanOrEqual(camera.maxZoom);

    camera.zoomAt(0, 0, 0.001);
    expect(camera.zoom).toBeGreaterThanOrEqual(camera.minZoom);
  });

  it('keeps anchor point stable during zoomAt', () => {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;

    const anchorScreenX = 400;
    const anchorScreenY = 300;
    const worldBefore = camera.screenToWorld(anchorScreenX, anchorScreenY);

    camera.zoomAt(anchorScreenX, anchorScreenY, 1.5);
    const worldAfter = camera.screenToWorld(anchorScreenX, anchorScreenY);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 3);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 3);
  });

  it('fits bounds centered to viewport', () => {
    const viewWidth = 400;
    const viewHeight = 800; // mobile portrait
    const bounds = { minX: 100, minY: 100, maxX: 1100, maxY: 700 }; // 1000 x 600

    camera.fitToBounds(viewWidth, viewHeight, bounds, 20);

    const centerWorldX = (bounds.minX + bounds.maxX) / 2;
    const centerWorldY = (bounds.minY + bounds.maxY) / 2;
    const centerScreen = camera.worldToScreen(centerWorldX, centerWorldY);

    expect(centerScreen.x).toBeCloseTo(viewWidth / 2, 1);
    expect(centerScreen.y).toBeCloseTo(viewHeight / 2, 1);
  });

  it('fits dynamically to planets array', () => {
    const viewWidth = 375;
    const viewHeight = 667;
    const mockPlanets = [
      { id: '1', x: 100, y: 100, radius: 30, owner: 'player1' as const, units: 10, maxUnits: 50, productionRate: 1, productionTimer: 0, pulsePhase: 0 },
      { id: '2', x: 1300, y: 800, radius: 40, owner: 'player2' as const, units: 10, maxUnits: 50, productionRate: 1, productionTimer: 0, pulsePhase: 0 },
    ];

    camera.fitToPlanets(viewWidth, viewHeight, mockPlanets, 20);

    // Both planets should be within screen coordinates
    const p1Screen = camera.worldToScreen(100, 100);
    const p2Screen = camera.worldToScreen(1300, 800);

    expect(p1Screen.x).toBeGreaterThanOrEqual(0);
    expect(p1Screen.y).toBeGreaterThanOrEqual(0);
    expect(p2Screen.x).toBeLessThanOrEqual(viewWidth);
    expect(p2Screen.y).toBeLessThanOrEqual(viewHeight);
  });
});
