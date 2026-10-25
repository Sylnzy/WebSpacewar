# Space Planet Conquest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance 60 FPS real-time space planet conquest web game featuring Bot AI and P2P multiplayer that deploys statically to Vercel.

**Architecture:** Vanilla TypeScript + HTML5 Canvas 2D neon glow renderer with host-authoritative WebRTC data channel synchronization (PeerJS) and procedural Web Audio SFX.

**Tech Stack:** Vite, TypeScript, HTML5 Canvas 2D, PeerJS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-space-planet-conquest-design.md`

## Global Constraints

- Runtime environment: 100% Client-side static SPA, zero dedicated server requirement.
- Target FPS: 60 FPS on standard desktop and mobile browsers.
- No heavy external game engines or large asset bundles (all SFX synthesized procedurally via Web Audio API).
- Testing framework: Vitest for fast TypeScript unit testing.
- Build output: Standard static assets in `dist/` ready for Vercel deployment.

## Review Focus

1. **Simultaneous Fleet Arrivals:** When multiple fleets (friendly or enemy) arrive at the same planet on the exact same tick, arrivals must resolve deterministically without NaN or negative unit counters.
2. **Zero or Negative Unit Guard:** A planet must never allow troop dispatches that reduce its unit count below 1, nor dispatch 0 troops.
3. **WebRTC Packet Dropping / Out of Order:** Guest commands must carry timestamps and monotonic sequence numbers so stale commands do not override fresher actions.
4. **HiDPI / Retina Canvas Scaling:** Canvas dimensions and context transforms must sync with `window.devicePixelRatio` so neon lines and text do not blur or misalign touch coordinates.
5. **Peer Disconnection Mid-Game:** If WebRTC connection drops during multiplayer, game must gracefully transition state and offer local AI takeover without crashing the renderer.

---

### Task 1: Project Scaffolding & Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vercel.json`
- Create: `index.html`

**Interfaces:**
- Consumes: Node.js / npm environment
- Produces: Vite build & Vitest test runners configured and operational

- [ ] **Step 1: Create `package.json` with dependencies**
Define `vite`, `typescript`, `peerjs`, and `vitest`.
- [ ] **Step 2: Create `tsconfig.json` and `vite.config.ts`**
Configure ESNext target, strict typing, and Vitest environment.
- [ ] **Step 3: Create `vercel.json` and basic HTML scaffold**
Provide clean static routing and HTML canvas container.
- [ ] **Step 4: Install dependencies and verify Vitest command**
Run: `npm install && npx vitest --run`
Expected: Passes with no test files found or clean status.
- [ ] **Step 5: Commit**
```bash
git add package.json tsconfig.json vite.config.ts vercel.json index.html
git commit -m "chore: scaffold project with vite, typescript, and vitest"
```

---

### Task 2: Core Types & Combat Resolver

**Files:**
- Create: `src/core/Types.ts`
- Create: `src/core/CombatResolver.ts`
- Test: `tests/combat.test.ts`

**Interfaces:**
- Consumes: N/A
- Produces: `Planet`, `Fleet`, `PlanetOwner`, `resolveCombat(planet: Planet, fleet: Fleet): CombatResult`

- [ ] **Step 1: Write failing tests in `tests/combat.test.ts`**
Test friendly reinforcement, enemy conquest when fleet > defense, enemy defense when fleet <= defense.
- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/combat.test.ts`
Expected: FAIL (module not found)
- [ ] **Step 3: Implement `Types.ts` and `CombatResolver.ts`**
Implement data types and deterministic combat resolution math.
- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/combat.test.ts`
Expected: PASS (all test cases pass)
- [ ] **Step 5: Commit**
```bash
git add src/core/Types.ts src/core/CombatResolver.ts tests/combat.test.ts
git commit -m "feat(core): implement core types and combat resolver with unit tests"
```

---

### Task 3: Balanced Map Generator

**Files:**
- Create: `src/core/MapGenerator.ts`
- Test: `tests/map.test.ts`

**Interfaces:**
- Consumes: `Planet`, `PlanetOwner` from `src/core/Types.ts`
- Produces: `generateMap(width: number, height: number, planetCount: number, seed?: number): Planet[]`

- [ ] **Step 1: Write failing tests in `tests/map.test.ts`**
Verify generated planets do not overlap, respect min/max radius, and have exactly 1 home planet for player1 and player2.
- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/map.test.ts`
Expected: FAIL
- [ ] **Step 3: Implement `MapGenerator.ts`**
Use deterministic PRNG (seedable) and Poisson disc/radial distribution to place symmetrical home planets and neutral satellites.
- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/map.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add src/core/MapGenerator.ts tests/map.test.ts
git commit -m "feat(core): implement balanced procedural map generator"
```

---

### Task 4: Game Engine & Simulation Loop

**Files:**
- Create: `src/core/GameEngine.ts`
- Test: `tests/engine.test.ts`

**Interfaces:**
- Consumes: `Planet`, `Fleet`, `CombatResolver`, `MapGenerator`
- Produces: `GameEngine` class (`update(dt: number)`, `dispatchFleet(fromIds, toId, ratio)`, `getState(): GameState`)

- [ ] **Step 1: Write failing tests in `tests/engine.test.ts`**
Test unit regeneration on owned planets, fleet movement toward target, dispatch validation, and victory condition detection.
- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/engine.test.ts`
Expected: FAIL
- [ ] **Step 3: Implement `GameEngine.ts`**
Implement fixed-timestep simulation, unit production caps, swarm movement vector calculations, and winner checks.
- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/engine.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add src/core/GameEngine.ts tests/engine.test.ts
git commit -m "feat(core): implement game engine simulation loop and unit dispatch"
```

---

### Task 5: Bot AI System

**Files:**
- Create: `src/ai/BotAI.ts`
- Test: `tests/bot.test.ts`

**Interfaces:**
- Consumes: `GameState`, `PlanetOwner`, `GameEngine`
- Produces: `BotAI` class (`update(dt: number): CommandAction | null`)

- [ ] **Step 1: Write failing tests in `tests/bot.test.ts`**
Test AI decision evaluation for Easy, Medium, and Hard profiles without illegal actions or crashes.
- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/bot.test.ts`
Expected: FAIL
- [ ] **Step 3: Implement `BotAI.ts`**
Implement evaluation timers, distance-to-unit scoring heuristics, and opportunistic counter-attack algorithms.
- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/bot.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add src/ai/BotAI.ts tests/bot.test.ts
git commit -m "feat(ai): implement multi-difficulty bot AI"
```

---

### Task 6: P2P Network Protocol & Manager

**Files:**
- Create: `src/net/Protocol.ts`
- Create: `src/net/NetworkManager.ts`
- Test: `tests/network.test.ts`

**Interfaces:**
- Consumes: `NetworkMessage` types, `GameState`
- Produces: `NetworkManager` class (`createRoom()`, `joinRoom(code)`, `sendSnapshot()`, `sendCommand()`, event callbacks)

- [ ] **Step 1: Write failing tests in `tests/network.test.ts`**
Test packet serialization, deserialization, sequence ordering, and snapshot delta compression.
- [ ] **Step 2: Run test to verify failure**
Run: `npx vitest run tests/network.test.ts`
Expected: FAIL
- [ ] **Step 3: Implement `Protocol.ts` and `NetworkManager.ts`**
Wrap PeerJS with room code generation, ping/pong latency measurement, and event handlers.
- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/network.test.ts`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add src/net/Protocol.ts src/net/NetworkManager.ts tests/network.test.ts
git commit -m "feat(net): implement P2P WebRTC networking layer via PeerJS"
```

---

### Task 7: Procedural Audio Synthesizer

**Files:**
- Create: `src/audio/SoundManager.ts`

**Interfaces:**
- Consumes: Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)
- Produces: `soundManager.playDispatch()`, `soundManager.playCapture()`, `soundManager.playCombat()`, `soundManager.playVictory()`, `soundManager.playDefeat()`

- [ ] **Step 1: Implement procedural sound synthesis in `src/audio/SoundManager.ts`**
Construct clean synth waveforms, envelopes, and gain falloffs with zero external asset dependencies.
- [ ] **Step 2: Verify audio methods initialize gracefully even when muted/suspended**
- [ ] **Step 3: Commit**
```bash
git add src/audio/SoundManager.ts
git commit -m "feat(audio): implement zero-asset procedural Web Audio synthesizer"
```

---

### Task 8: Canvas 2D Neon Renderer, Starfield & Particle FX

**Files:**
- Create: `src/render/Starfield.ts`
- Create: `src/render/ParticleSystem.ts`
- Create: `src/render/CanvasRenderer.ts`

**Interfaces:**
- Consumes: `GameState`, `HTMLCanvasElement`
- Produces: `CanvasRenderer.render(state: GameState, targetingVisuals?: TargetingData)`

- [ ] **Step 1: Implement `Starfield.ts` parallax background**
- [ ] **Step 2: Implement `ParticleSystem.ts` object pool**
500 reusable particles for explosion shockwaves and ship neon trails.
- [ ] **Step 3: Implement `CanvasRenderer.ts`**
Render glowing planets, unit counters, swarm triangle ships, targeting laser arrows, and dynamic aura rings.
- [ ] **Step 4: Commit**
```bash
git add src/render/Starfield.ts src/render/ParticleSystem.ts src/render/CanvasRenderer.ts
git commit -m "feat(render): implement neon sci-fi 2D canvas renderer and particle pool"
```

---

### Task 9: Input Controller (Mouse & Touch)

**Files:**
- Create: `src/input/InputController.ts`

**Interfaces:**
- Consumes: DOM events (`mousedown`, `mousemove`, `mouseup`, `touchstart`, `touchmove`, `touchend`, key presses)
- Produces: Selection callbacks and `onDispatch(fromIds, toId, ratio)` events

- [ ] **Step 1: Implement drag-and-drop targeting and click-to-click selections**
- [ ] **Step 2: Handle touch events with coordinate normalization for HiDPI screens**
- [ ] **Step 3: Implement ratio hotkeys (1-4) and "Select All" key ('A')**
- [ ] **Step 4: Commit**
```bash
git add src/input/InputController.ts
git commit -m "feat(input): implement dual mouse and touch input controller"
```

---

### Task 10: UI / HUD State Machine & Main Game Loop

**Files:**
- Create: `src/ui/UIManager.ts`
- Create: `src/style.css`
- Create: `src/main.ts`

**Interfaces:**
- Consumes: All core, render, net, audio, and input modules
- Produces: Complete playable web game with Main Menu, Lobby, In-Game HUD, and Game Over modals

- [ ] **Step 1: Style modern neon sci-fi UI overlay in `src/style.css`**
- [ ] **Step 2: Implement UI modal transitions in `src/ui/UIManager.ts`**
- [ ] **Step 3: Wire game loop and multiplayer coordination in `src/main.ts`**
- [ ] **Step 4: Commit**
```bash
git add src/ui/UIManager.ts src/style.css src/main.ts
git commit -m "feat(ui): connect main menu, HUD, game loop, and game over screens"
```

---

### Task 11: End-to-End Build & Test Verification

**Files:**
- Verify: Full test suite passing
- Verify: Static production bundle builds cleanly (`dist/`)

- [ ] **Step 1: Run all unit tests**
Run: `npm test`
Expected: 100% tests passing across combat, map, engine, bot, and network.
- [ ] **Step 2: Run production build**
Run: `npm run build`
Expected: `dist/` directory generated with zero warnings or errors.
- [ ] **Step 3: Commit and tag release**
```bash
git add .
git commit -m "chore: verify tests and production build for space planet conquest"
```
