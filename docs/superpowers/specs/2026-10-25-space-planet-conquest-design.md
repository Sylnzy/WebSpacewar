# Spesifikasi Teknis: Space Planet Conquest RTS Game

- **Tanggal**: 2026-10-25
- **Status**: Draft Disetujui
- **Target Platform**: Web Browser (Desktop & Mobile Touch), 100% Static Deployment (Vercel / GitHub Pages)
- **Teknologi Utama**: Vite, TypeScript, HTML5 Canvas 2D, PeerJS (WebRTC P2P), Web Audio API, Vitest

---

## 1. Ikhtisar & Tujuan Proyek

Aplikasi game web *real-time strategy* bertema penaklukan antariksa (terinspirasi Galcon / Auralux). Pemain mengendalikan satu atau lebih planet yang secara berkala memproduksi unit armada luar angkasa. Pemain mengirimkan armada untuk merebut planet netral atau planet musuh. Pemenang adalah pihak yang berhasil menguasai seluruh planet dan melenyapkan seluruh armada lawan.

### Kriteria Keberhasilan
1. **Performa Tinggi**: Berjalan konsisten pada 60 FPS di desktop maupun mobile browser tanpa WebGL library yang berat.
2. **Mudah Dideploy**: Build murni static assets (`dist/`), zero backend server khusus, dapat langsung di-deploy di Vercel secara gratis.
3. **Fleksibilitas Mode**:
   - **Solo vs Bot AI**: 3 tingkat kesulitan (*Easy*, *Medium*, *Hard*) berjalan 100% di browser.
   - **Multiplayer P2P**: 2 pemain terhubung via WebRTC DataChannel menggunakan room code ringkas (PeerJS).

---

## 2. Arsitektur Sistem

Sistem dirancang modular dengan pemisahan tegas antara logika simulasi (*GameEngine*), visualisasi (*CanvasRenderer*), jaringan (*P2PNetworkManager*), audio (*SoundSynth*), dan antarmuka (*UIManager*).

```
                      +-------------------+
                      |   UI / HUD DOM    |
                      +---------+---------+
                                |
+-------------------------------+-------------------------------+
|                        Game Controller                        |
+-------------------------------+-------------------------------+
        |                       |                       |
        v                       v                       v
+---------------+       +---------------+       +---------------+
|  InputManager |       |   SoundSynth  |       | P2PNetworkMgr |
| (Mouse/Touch) |       | (Web Audio)   |       |  (PeerJS P2P) |
+-------+-------+       +---------------+       +-------+-------+
        |                                               |
        v                                               v
+---------------+                               +---------------+
|  GameEngine   |<==============================| Host/Guest    |
| (Simulasi 60Hz|  Command Actions / Snapshots  | Sync Protocol |
|  Bot AI State)|                               +---------------+
+-------+-------+
        |
        v
+---------------+
| CanvasRenderer|
| (Neon Glow 2D,|
| Particle Pool)|
+---------------+
```

---

## 3. Model Data & Tipe (TypeScript)

### 3.1 Entitas Planet
```typescript
export type PlanetOwner = 'neutral' | 'player1' | 'player2';

export interface Planet {
  id: string;
  x: number;
  y: number;
  radius: number;           // 18px (kecil) s.d. 45px (besar)
  owner: PlanetOwner;
  units: number;            // Jumlah pasukan di planet
  maxUnits: number;         // Kapasitas tampung maksimum
  productionRate: number;   // Unit per detik (misal 1.0 s.d. 3.0)
  productionTimer: number;  // Akumulator waktu tick
  pulsePhase: number;       // Animasi visual denyut neon
}
```

### 3.2 Entitas Armada (Fleet Swarm)
```typescript
export interface Fleet {
  id: string;
  sourcePlanetId: string;
  targetPlanetId: string;
  owner: PlanetOwner;
  units: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;            // Kecepatan konstan (px/detik)
  totalDistance: number;
  traveledDistance: number;
}
```

### 3.3 Status Pertandingan (GameState)
```typescript
export type GameStatus = 'waiting' | 'running' | 'paused' | 'ended';

export interface GameState {
  status: GameStatus;
  winner: PlanetOwner | null;
  elapsedTime: number;
  planets: Planet[];
  fleets: Fleet[];
  sendRatio: number;        // 0.25, 0.50, 0.75, 1.00 (default 0.50)
  selectedPlanetIds: string[];
}
```

### 3.4 Protokol Jaringan P2P
```typescript
export type NetworkMessage =
  | { type: 'LOBBY_READY'; role: 'host' | 'guest'; name: string }
  | { type: 'GAME_START'; seed: number; planets: Planet[] }
  | { type: 'COMMAND_DISPATCH'; fromPlanetIds: string[]; toPlanetId: string; ratio: number; timestamp: number }
  | { type: 'STATE_SNAPSHOT'; state: GameState; timestamp: number }
  | { type: 'PEER_PING'; clientTime: number }
  | { type: 'PEER_PONG'; clientTime: number; serverTime: number }
  | { type: 'PLAYER_SURRENDER'; owner: PlanetOwner };
```

---

## 4. Mekanik Permainan & Combat

### 4.1 Produksi Pasukan
- Hanya planet berpemilik (`player1` atau `player2`) yang memproduksi pasukan. Planet netral tidak menambah pasukan.
- Formulasi per tick (dt dalam detik):
  ```typescript
  if (planet.owner !== 'neutral') {
    planet.units = Math.min(planet.maxUnits, planet.units + planet.productionRate * dt);
  }
  ```

### 4.2 Pengiriman Armada
- Saat pemain memerintahkan pengiriman dari Planet A ke Planet B:
  - Validasi: `unitsToSend = Math.floor(planetA.units * sendRatio)`.
  - Syarat minimum: `unitsToSend >= 1` dan `planetA.units >= 2`.
  - Eksekusi: `planetA.units -= unitsToSend`.
  - Instansiasi `Fleet` menuju titik pusat Planet B.

### 4.3 Resolusi Pertarungan (Combat Arrival)
- Ketika armada mencapai radius target:
  - **Jika target adalah planet kawan (`fleet.owner === planet.owner`)**:
    ```typescript
    planet.units += fleet.units;
    ```
  - **Jika target adalah planet lawan atau netral (`fleet.owner !== planet.owner`)**:
    ```typescript
    if (fleet.units > planet.units) {
      // Penaklukan berhasil
      planet.owner = fleet.owner;
      planet.units = fleet.units - planet.units;
      triggerPlanetCaptureFX(planet);
    } else {
      // Penaklukan gagal / pertahanan bertahan
      planet.units -= fleet.units;
      triggerDefendFX(planet);
    }
    ```

### 4.4 Kondisi Akhir (Victory / Defeat)
- Pemain dinyatakan kalah jika tidak memiliki planet tersisa DAN tidak memiliki armada tersisa di udara.
- Kondisi kemenangan dicek setiap tick simulasi.

---

## 5. Logika Bot AI (Singleplayer Mode)

Bot AI berjalan pada interval evaluasi berkala untuk menyerupai waktu reaksi manusia:
1. **Tingkat Easy**:
   - Interval evaluasi: 3.5 – 4.5 detik.
   - Logika: Memilih secara acak planet milik bot yang memiliki unit > 20, lalu mengirim 50% pasukan ke planet netral terdekat yang jumlah pasukannya lebih sedikit.
2. **Tingkat Medium**:
   - Interval evaluasi: 1.5 – 2.0 detik.
   - Logika: Menghitung skor ekspansi berbasis `(jarak / rasio_unit)`. Memprioritaskan planet netral yang mudah direbut, kemudian mencari planet musuh yang sedang kekurangan pasukan.
3. **Tingkat Hard**:
   - Interval evaluasi: 0.6 – 1.0 detik.
   - Logika:
     - Melacak armada musuh yang sedang bergerak; jika planet musuh kosong karena baru saja mengirim pasukan, bot langsung melancarkan serangan balasan cepat (*counter-attack*).
     - Mengumpulkan armada dari beberapa planet sekaligus (*multi-source dispatch*) untuk menembus planet pertahanan terkuat lawan.

---

## 6. Arsitektur Multiplayer P2P (PeerJS)

1. **Host-Authoritative Model**:
   - Pemain yang membuat room bertindak sebagai `Host`.
   - Host menjalankan simulasi `GameEngine` penuh, termasuk penghitungan pergerakan armada, regenerasi unit, dan deteksi kemenangan.
   - Host memancarkan `STATE_SNAPSHOT` ke Guest setiap 50ms (20Hz) melalui WebRTC Unreliable/Ordered DataChannel.
2. **Input Guest**:
   - Guest hanya memvalidasi seleksi lokal dan mengirimkan `COMMAND_DISPATCH` ke Host.
   - Host memverifikasi keabsahan perintah (apakah planet asal benar milik `player2`) lalu menerapkannya ke simulasi.
3. **Sinkronisasi & Anti-Lag**:
   - Guest melakukan interpolasi visual posisi armada agar pergerakan tetap mulus di 60 FPS di antara snapshot snapshot 50ms.
   - Estimasi round-trip latency ditampilkan di HUD (indikator Ping).
4. **Resiliensi Disconnect**:
   - Jika koneksi WebRTC terputus di tengah permainan, Guest/Host menerima notifikasi visual seketika dengan opsi melanjutkan sisa pertandingan melawan Bot AI.

---

## 7. Visual & Audio (Neon Sci-Fi Aesthetic)

### 7.1 Canvas 2D Neon Glow
- **Latar Belakang**: Ruang hampa bertabur bintang (*parallax starfield*).
- **Planet**:
  - Lingkaran bersinar dengan bayangan neon (`ctx.shadowBlur` dan `radialGradient`).
  - Warna: Cyan/Biru Elektrik (`Player 1`), Magenta/Merah Neon (`Player 2`), Abu-abu/Putih redup (`Neutral`).
  - Text angka pasukan ditampilkan di tengah planet dengan font sans-serif monospaced tebal dan kontras tinggi.
- **Armada (Swarm)**:
  - Sekumpulan kapal segitiga neon kecil yang bergerak mengikuti jalur garis lurus.
  - Setiap kapal meninggalkan partikel ekor (*trail particle*) yang memudar perlahan.
- **Efek Partikel**:
  - Kolam partikel (*Particle Pool*) berkapasitas 500 objek untuk ledakan penaklukan planet dan tabrakan armada guna mencegah *garbage collection spike*.

### 7.2 Web Audio Procedural Synthesizer
- Tidak membutuhkan file audio eksternal (`.mp3`/`.wav`) sehingga tidak ada waktu tunggu unduh asset:
  - **Dispatch Sound**: Short frequency sweep down (800Hz ke 300Hz) oscillator sine.
  - **Capture Sound**: Arpeggio chord ceria dengan filter resonan.
  - **Combat Impact**: White noise burst dengan decay 0.1s.
  - **Victory/Defeat**: Fanfare synth nada tinggi / chord minor muram.

---

## 8. Kontrol Input & Antarmuka Pengguna (UI)

### 8.1 Input Handling
- **Drag-to-Send**: Drag kursor/jari dari planet asal ke planet target -> garis bidik neon muncul dengan indikator jumlah pasukan yang akan dikirim -> lepas untuk meluncurkan.
- **Click-to-Click**: Klik planet asal untuk memilih (lingkaran neon berputar menandai seleksi), lalu klik planet target untuk meluncurkan.
- **Multi-Selection**: Klik dua kali di ruang kosong atau tekan tombol 'A' untuk memilih seluruh planet milik sendiri.
- **Rasio Pengiriman**: Tombol HUD interaktif `[25%]`, `[50%]`, `[75%]`, `[100%]` serta shortcut keyboard `1`, `2`, `3`, `4`.

### 8.2 Struktur Layar
1. **Layar Menu Utama**:
   - Mode Solo: Tombol Play vs AI dengan pilihan kesulitan (Easy / Medium / Hard).
   - Mode Multiplayer: Tombol "Create Room" (menampilkan Room Code & Tombol Salin Tautan) dan "Join Room" (input text kode).
2. **Layar Game (HUD)**:
   - Bar dominasi galaksi di bagian atas (persentase total kepemilikan unit).
   - Tombol pengatur rasio pasukan di bawah.
   - Indikator koneksi & tombol Pause/Menyerah.
3. **Layar Game Over**:
   - Pengumuman Menang/Kalah.
   - Statistik pertandingan: Waktu permainan, total pasukan dikerahkan, planet yang berhasil direbut.
   - Tombol "Rematch" dan "Kembali ke Menu".

---

## 9. Struktur Kode & Modul

```
/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                   # Entry point aplikasi
│   ├── style.css                 # Styling neon sci-fi & UI overlay
│   ├── core/
│   │   ├── GameEngine.ts         # Inti simulasi state & rule loop
│   │   ├── MapGenerator.ts       # Generator tata letak planet seimbang
│   │   ├── CombatResolver.ts     # Logika perhitungan pertempuran
│   │   └── Types.ts              # Definisi interface & enum
│   ├── ai/
│   │   └── BotAI.ts              # Logika kecerdasan bot (Easy/Med/Hard)
│   ├── render/
│   │   ├── CanvasRenderer.ts     # Renderer 60 FPS HTML5 Canvas
│   │   ├── ParticleSystem.ts     # Sistem partikel neon pool
│   │   └── Starfield.ts          # Latar bintang bergerak
│   ├── net/
│   │   ├── NetworkManager.ts     # Wrapper PeerJS WebRTC P2P
│   │   └── Protocol.ts           # Definisi packet data snapshot/command
│   ├── audio/
│   │   └── SoundManager.ts       # Web Audio API procedural synthesizer
│   ├── input/
│   │   └── InputController.ts    # Mouse, Touch & Keyboard handler
│   └── ui/
│       └── UIManager.ts          # State screen menu, HUD, & modal game over
└── tests/
    ├── combat.test.ts            # Unit test kalkulasi pertarungan
    ├── engine.test.ts            # Unit test siklus produksi & state
    └── bot.test.ts               # Unit test keputusan bot AI
```

---

## 10. Strategi Pengujian (Testing)

- **Unit Test (Vitest)**:
  - Validasi perhitungan pertempuran: unit sama besar, armada lebih besar, armada lebih kecil.
  - Validasi batas minimum unit untuk pengiriman pasukan.
  - Validasi regenerasi unit: planet netral tidak bertambah, planet berpemilik dibatasi oleh `maxUnits`.
  - Validasi generator peta: memastikan jarak antar planet tidak tumpang tindih dan simetris untuk kedua pemain.
  - Validasi AI Bot: verifikasi bot menghasilkan aksi valid tanpa melempar error.
- **Manual Multi-Client Test**:
  - Membuka 2 tab browser berbeda untuk menguji host & guest P2P handshake, propagasi armada, dan kondisi akhir kemenangan.

---

## 11. Deployment

- Target build: `npm run build` menghasilkan folder `dist/` berisi file statis murni (`index.html`, bundle `.js`, `.css`).
- Konfigurasi `vercel.json` sederhana:
  ```json
  {
    "cleanUrls": true
  }
  ```
- Deploy instan ke Vercel via CLI atau GitHub integration tanpa kebutuhan server runtime aktif.
