# 🚀 Space Planet Conquest - Web RTS

Game *real-time strategy* (RTS) bertema penaklukan planet antariksa berbasis web (terinspirasi dari Galcon & Auralux). Kuasai tata surya, produksi armada luar angkasa dari planet Anda, dan luncurkan serangan taktis untuk merebut seluruh galaksi!

Bermain secara **Solo melawan Bot AI** (Easy, Medium, Hard) atau **Multiplayer Online 1v1** melawan teman secara langsung via WebRTC P2P tanpa server backend.

---

## 🌟 Fitur Utama

- **100% Client-Side & Static**: Dibangun dengan Vite & TypeScript murni. Tidak memerlukan server runtime backend, 100% gratis dideploy di **Vercel** atau **GitHub Pages**.
- **Multiplayer Online P2P**: Menggunakan WebRTC DataChannel via PeerJS dengan sistem Room Code ringkas (`SP-XXXX`). Latency rendah langsung antar-perangkat.
- **Bot AI Cerdas**: 3 tingkat kesulitan:
  - **Easy**: Ekspansi santai mengincar planet netral terdekat.
  - **Medium**: Taktik kalkulasi rasio jarak dan kekuatan pertahanan.
  - **Hard**: Serangan balik cepat (*counter-attack* oportunistik) dan mobilisasi armada gabungan dari banyak planet sekaligus.
- **Visual Neon Sci-Fi 2D**: Efek glow neon intensif, partikel shockwave ledakan, ekor armada, dan latar belakang bintang dinamis berjalan mulus di 60 FPS pada desktop maupun perangkat mobile.
- **Zero-Asset Procedural Audio**: Efek suara disintesis langsung menggunakan Web Audio API tanpa perlu mengunduh file MP3/WAV eksternal (loading instan).
- **Kontrol Responsif**:
  - Drag-and-drop garis bidik laser neon.
  - Klik planet asal lalu klik planet tujuan.
  - Dukungan layar sentuh (mobile/tablet) dengan pencegahan scroll otomatis saat membidik.
  - Pengatur rasio pengiriman pasukan (`25%`, `50%`, `75%`, `100%`) dan shortcut hotkey `1`-`4`, serta tombol `A` untuk memilih seluruh planet.

---

## 🎮 Cara Bermain

1. **Awal Permainan**: Anda memulai dengan 1 planet asal (warna **Cyan** untuk Pemain 1, atau **Magenta** untuk Pemain 2/Lawan). Planet netral berwarna **Abu-abu/Perak**.
2. **Produksi Unit**: Planet yang Anda kuasai secara otomatis memproduksi pasukan baru setiap detik (semakin besar ukuran planet, semakin cepat produksinya).
3. **Mengirim Pasukan**:
   - Tarik garis dari planet Anda ke planet tujuan (atau klik planet Anda lalu klik planet target).
   - Gunakan tombol rasio di bagian bawah untuk menentukan persentase pasukan yang dikirim (`25%`, `50%`, `75%`, `100%`).
4. **Menaklukkan Planet**:
   - Jika armada Anda sampai di planet lawan/netral dan jumlah pasukan Anda lebih besar dari pasukan penjaga planet tersebut, planet akan berhasil direbut dan mulai memproduksi pasukan untuk Anda.
5. **Kemenangan**: Rebut seluruh planet dan musnahkan seluruh armada musuh di galaksi!

---

## 🛠️ Tech Stack

- **Frontend & Bundler**: [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Graphics**: HTML5 Canvas 2D Context (dengan penskalaan HiDPI / Retina `devicePixelRatio`)
- **Networking**: [PeerJS](https://peerjs.com/) (WebRTC DataChannel P2P)
- **Audio**: Web Audio API (procedural oscillator & gain envelopes)
- **Testing**: [Vitest](https://vitest.dev/) (21 unit tests untuk logika combat, procedural map, engine loop, AI heuristics, dan protokol jaringan)

---

## 🚀 Menjalankan Secara Lokal

```bash
# Clone repository
git clone https://github.com/Sylnzy/WebSpacewar.git
cd WebSpacewar

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka peramban di `http://localhost:3000`.

### Menjalankan Unit Tests
```bash
npm test
```

### Build Production
```bash
npm run build
```
File build statis akan dihasilkan di folder `dist/`.

---

## 🌐 Deploy ke Vercel

Game ini sudah dilengkapi dengan `vercel.json` dan siap di-deploy secara instan:

1. Buka dashboard [Vercel](https://vercel.com).
2. Klik **Add New Project** -> Pilih repositori **Sylnzy/WebSpacewar**.
3. Pastikan Framework Preset terpilih **Vite**, Build Command: `npm run build`, Output Directory: `dist`.
4. Klik **Deploy**. Game Anda langsung online dan dapat dimainkan secara multiplayer bersama teman!

---

## 📄 Lisensi

MIT License © 2026 Maulana Hasanudin (Sylnzy)
