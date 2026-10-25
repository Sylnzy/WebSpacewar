import { GameState, Planet, PlanetOwner } from '../core/Types';
import { DragTargetVisual } from '../render/CanvasRenderer';

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
  private playerOwner: PlanetOwner;
  private callbacks: InputCallbacks;

  private isDragging: boolean = false;
  private dragFromPlanetIds: string[] = [];
  private currentDragPos: { x: number; y: number } = { x: 0, y: 0 };
  private hoveredPlanetId: string | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    getState: () => GameState,
    playerOwner: PlanetOwner = 'player1',
    callbacks: InputCallbacks = {}
  ) {
    this.canvas = canvas;
    this.getState = getState;
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

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private findPlanetAt(x: number, y: number, extraMargin: number = 8): Planet | null {
    const state = this.getState();
    for (const p of state.planets) {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist <= p.radius + extraMargin) {
        return p;
      }
    }
    return null;
  }

  private bindEvents(): void {
    // Mouse Events
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY, e.shiftKey));
    window.addEventListener('mousemove', (e) => this.handlePointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => this.handlePointerUp(e.clientX, e.clientY));

    // Touch Events
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.handlePointerDown(t.clientX, t.clientY, false);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        e.preventDefault(); // prevent scroll while aiming
        const t = e.touches[0];
        this.handlePointerMove(t.clientX, t.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (this.isDragging) {
        const t = e.changedTouches[0];
        this.handlePointerUp(t.clientX, t.clientY);
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
    const coords = this.getCanvasCoords(clientX, clientY);
    const planet = this.findPlanetAt(coords.x, coords.y);
    const state = this.getState();

    if (planet) {
      if (planet.owner === this.playerOwner) {
        // Start Dragging from this planet or currently selected planets
        this.isDragging = true;
        this.currentDragPos = coords;

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
      // Clicked on empty cosmic space: clear selection
      this.callbacks.onClearSelection?.();
    }
  }

  private handlePointerMove(clientX: number, clientY: number): void {
    const coords = this.getCanvasCoords(clientX, clientY);
    this.currentDragPos = coords;

    const planet = this.findPlanetAt(coords.x, coords.y);
    this.hoveredPlanetId = planet ? planet.id : null;
  }

  private handlePointerUp(clientX: number, clientY: number): void {
    if (!this.isDragging) return;

    const coords = this.getCanvasCoords(clientX, clientY);
    const targetPlanet = this.findPlanetAt(coords.x, coords.y);
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
  }
}
