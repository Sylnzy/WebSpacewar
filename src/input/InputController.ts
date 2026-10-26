import { GameState, Planet, PlanetOwner } from '../core/Types';
import { DragTargetVisual } from '../render/CanvasRenderer';
import { Camera } from '../render/Camera';

export interface InputCallbacks {
  onDispatch?: (fromPlanetIds: string[], toPlanetId: string, ratio: number) => void;
  onRatioChange?: (ratio: number) => void;
  onSelectPlanet?: (planetId: string, multi: boolean) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

export class InputController {
  private canvas: HTMLCanvasElement;
  private getState: () => GameState;
  public camera: Camera;
  private playerOwner: PlanetOwner;
  private callbacks: InputCallbacks;

  // Drag Aiming state (Fleet dispatch)
  private isDragging: boolean = false;
  private dragFromPlanetIds: string[] = [];
  private currentDragPos: { x: number; y: number } = { x: 0, y: 0 };
  private hoveredPlanetId: string | null = null;

  // Camera Pan state
  private isPanning: boolean = false;
  private lastPanPos: { x: number; y: number } = { x: 0, y: 0 };
  private panTotalDist: number = 0;

  // Pinch-to-zoom state
  private pinchInitialDist: number = 0;
  private lastPinchMid: { x: number; y: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    getState: () => GameState,
    camera: Camera,
    playerOwner: PlanetOwner = 'player1',
    callbacks: InputCallbacks = {}
  ) {
    this.canvas = canvas;
    this.getState = getState;
    this.camera = camera;
    this.playerOwner = playerOwner;
    this.callbacks = callbacks;

    this.bindEvents();
  }

  public setPlayerOwner(owner: PlanetOwner): void {
    this.playerOwner = owner;
  }

  public setCallbacks(callbacks: InputCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getDragVisual(): DragTargetVisual | null {
    if (!this.isDragging || this.dragFromPlanetIds.length === 0) {
      return null;
    }

    return {
      fromPlanetIds: this.dragFromPlanetIds,
      toX: this.currentDragPos.x,
      toY: this.currentDragPos.y,
      targetPlanetId: this.hoveredPlanetId,
      ratio: this.getState().sendRatio,
    };
  }

  public getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  public getWorldCoords(clientX: number, clientY: number): { x: number; y: number } {
    const screen = this.getCanvasCoords(clientX, clientY);
    return this.camera.screenToWorld(screen.x, screen.y);
  }

  private findPlanetAt(worldX: number, worldY: number, extraMargin: number = 10): Planet | null {
    const state = this.getState();
    for (const p of state.planets) {
      const dist = Math.hypot(p.x - worldX, p.y - worldY);
      if (dist <= p.radius + extraMargin) {
        return p;
      }
    }
    return null;
  }

  private bindEvents(): void {
    // Mouse Events
    this.canvas.addEventListener('mousedown', (e) => {
      this.handlePointerDown(e.clientX, e.clientY, e.shiftKey);
    });

    window.addEventListener('mousemove', (e) => {
      this.handlePointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', (e) => {
      this.handlePointerUp(e.clientX, e.clientY);
    });

    // Mouse Wheel Zoom
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const screen = this.getCanvasCoords(e.clientX, e.clientY);
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        this.camera.zoomAt(screen.x, screen.y, factor);
      },
      { passive: false }
    );

    // Touch Events with Pinch & Pan
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 2) {
          // Cancel active fleet aim
          this.isDragging = false;
          this.isPanning = false;
          this.dragFromPlanetIds = [];
          this.hoveredPlanetId = null;

          const t0 = e.touches[0];
          const t1 = e.touches[1];
          this.pinchInitialDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
          this.lastPinchMid = {
            x: (t0.clientX + t1.clientX) / 2,
            y: (t0.clientY + t1.clientY) / 2,
          };
        } else if (e.touches.length === 1) {
          const t = e.touches[0];
          this.handlePointerDown(t.clientX, t.clientY, false);
        }
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const t0 = e.touches[0];
          const t1 = e.touches[1];
          const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
          const mid = {
            x: (t0.clientX + t1.clientX) / 2,
            y: (t0.clientY + t1.clientY) / 2,
          };

          if (this.pinchInitialDist > 0 && dist > 5) {
            const factor = dist / this.pinchInitialDist;
            const canvasMid = this.getCanvasCoords(mid.x, mid.y);
            this.camera.zoomAt(canvasMid.x, canvasMid.y, factor);
            this.pinchInitialDist = dist;
          }

          if (this.lastPinchMid) {
            const dx = mid.x - this.lastPinchMid.x;
            const dy = mid.y - this.lastPinchMid.y;
            this.camera.pan(dx, dy);
            this.lastPinchMid = mid;
          }
        } else if (e.touches.length === 1) {
          if (this.isDragging || this.isPanning) {
            e.preventDefault();
            const t = e.touches[0];
            this.handlePointerMove(t.clientX, t.clientY);
          }
        }
      },
      { passive: false }
    );

    window.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        this.pinchInitialDist = 0;
        this.lastPinchMid = null;
      }
      if (e.touches.length === 0 && (this.isDragging || this.isPanning)) {
        if (e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          this.handlePointerUp(t.clientX, t.clientY);
        } else {
          this.isDragging = false;
          this.isPanning = false;
        }
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === '1') {
        this.callbacks.onRatioChange?.(0.25);
      } else if (key === '2') {
        this.callbacks.onRatioChange?.(0.50);
      } else if (key === '3') {
        this.callbacks.onRatioChange?.(0.75);
      } else if (key === '4') {
        this.callbacks.onRatioChange?.(1.00);
      } else if (key === 'a') {
        this.callbacks.onSelectAll?.();
      } else if (key === 'escape') {
        this.callbacks.onClearSelection?.();
      }
    });
  }

  private handlePointerDown(clientX: number, clientY: number, shiftKey: boolean): void {
    const worldCoords = this.getWorldCoords(clientX, clientY);
    const planet = this.findPlanetAt(worldCoords.x, worldCoords.y);
    const state = this.getState();

    if (planet) {
      if (planet.owner === this.playerOwner) {
        // Start Dragging from this planet or currently selected planets
        this.isDragging = true;
        this.isPanning = false;
        this.currentDragPos = worldCoords;

        if (state.selectedPlanetIds.includes(planet.id)) {
          this.dragFromPlanetIds = [...state.selectedPlanetIds];
        } else {
          this.dragFromPlanetIds = [planet.id];
          this.callbacks.onSelectPlanet?.(planet.id, shiftKey);
        }
      } else {
        // Clicked on a non-owned planet while planets were selected: Dispatch!
        if (state.selectedPlanetIds.length > 0) {
          this.callbacks.onDispatch?.(
            state.selectedPlanetIds,
            planet.id,
            state.sendRatio
          );
        }
      }
    } else {
      // Clicked on empty cosmic space: initiate camera Pan
      this.isPanning = true;
      this.isDragging = false;
      this.lastPanPos = { x: clientX, y: clientY };
      this.panTotalDist = 0;
    }
  }

  private handlePointerMove(clientX: number, clientY: number): void {
    if (this.isDragging) {
      const worldCoords = this.getWorldCoords(clientX, clientY);
      this.currentDragPos = worldCoords;

      const planet = this.findPlanetAt(worldCoords.x, worldCoords.y);
      this.hoveredPlanetId = planet ? planet.id : null;
    } else if (this.isPanning) {
      const dx = clientX - this.lastPanPos.x;
      const dy = clientY - this.lastPanPos.y;
      this.camera.pan(dx, dy);
      this.panTotalDist += Math.hypot(dx, dy);
      this.lastPanPos = { x: clientX, y: clientY };
    }
  }

  private handlePointerUp(clientX: number, clientY: number): void {
    if (this.isDragging) {
      const worldCoords = this.getWorldCoords(clientX, clientY);
      const targetPlanet = this.findPlanetAt(worldCoords.x, worldCoords.y);
      const state = this.getState();

      if (targetPlanet && this.dragFromPlanetIds.length > 0) {
        // Dispatch fleet to target
        this.callbacks.onDispatch?.(
          this.dragFromPlanetIds,
          targetPlanet.id,
          state.sendRatio
        );
      }

      this.isDragging = false;
      this.dragFromPlanetIds = [];
      this.hoveredPlanetId = null;
    } else if (this.isPanning) {
      if (this.panTotalDist < 6) {
        // Stationary tap on empty cosmic space: clear selection
        this.callbacks.onClearSelection?.();
      }
      this.isPanning = false;
      this.panTotalDist = 0;
    }
  }
}
