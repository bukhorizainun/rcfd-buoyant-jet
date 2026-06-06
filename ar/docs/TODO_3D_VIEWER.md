# TODO — 3D Field Viewer (lanjutan)

Status saat ini: vortex sudah terbaca jelas di viewer 3D setelah commit `456d8a2`
(streamline tegas + underglow sejuk + 1 bidang simetri `nZ:1` + partikel jadi
kabut halus `uAlpha 0.5`). Dua item di bawah ini OPSIONAL — buat polish, bukan
perbaikan bug.

- **Task A — SELESAI.** Toggle Real/Model sudah jalan + terverifikasi (gstack
  screenshot): chip `#m3dSource` ("rCFD data" / "Model"), `setSource` di
  `viewer3d.js` ngalihin streamlines/glyphs/slice/jet ke field analitik (`null`),
  `jet-gpu` `setField`/`setAlpha`, dan label provenance di legend ikut jujur
  ("rCFD field" ↔ "model · analytic laminar"). Dua-dua mode pusarannya terbaca.
- **Task B — SELESAI.** Partikel comet-streak sudah jalan + terverifikasi (gstack
  screenshot, WebGL headless). `simulation/jet-gpu.js` sekarang render
  `THREE.LineSegments` (2 vertex/partikel: tail + head, attribute `aEnd`); posisi
  diekstrak ke fungsi `parcelPos(phase, ...)` yang dipanggil di fase head (`basePhase`)
  dan tail (`basePhase − uTrail`), jadi segmen mengekor sepanjang aliran nyata.
  Comet-fade di FRAG (`vEnd` → tail redup), uniform `uTrail` (default 0.08),
  `setCount` dikoreksi ke unit 2 vertex/partikel. Dipakai BERSAMA viewer 3D + Flow
  panel — dua-duanya streak-nya melingkar di vortex (rCFD data, Model, dan Flow).
  POLISH (feedback "viewer 3D seperti robot / tanpa aliran, panel Flow yg oke"):
  field nyata bergerak lambat per fase → trail pendek cuma jadi coretan diam. Fix:
  jalur real-field pakai trail panjang (0.22 vs 0.10 model), alpha streak naik
  0.5→0.72 (jadi hero), fase dipercepat (uTime*0.13), + fade parcel berkecepatan
  rendah (`dens *= mix(0.08,1,smoothstep(0.05,0.34,spd))`) biar zona stratifikasi
  diam hilang. Streamline diturunkan jadi panduan tipis (opacity 0.45 via opsi baru
  `opts.opacity` di streamlines.js) karena streak sudah mengungkap vortex sendiri.
  Panel Flow TIDAK tersentuh (jalur analitik: trail default 0.08, opacity default
  0.92, tanpa speed-fade). Re-verified gstack: rCFD kini mengalir + ada gerak antar
  frame, Model tetap bersih.

## Cara jalanin & verifikasi (sama untuk dua task)
```bash
# 1. server lokal dari folder summary_site
python -m http.server 8899 --bind 127.0.0.1
# 2. buka http://127.0.0.1:8899/ar/index.html → "Explore on screen" → tombol "3D"
# CATATAN: modul ES di-cache browser. Setelah edit, HARD REFRESH / restart browser
#          (lihat dev note di project_ar_poster memory).
```
Verifikasi visual cukup screenshot face-on; data asli ada di `data/cfd_field.json`
(dari `END_rCFD_RUN`, sudah terbukti punya 2 vortex via streamplot).

---

## Task A — Toggle "Real / Model" di viewer 3D  ✅ SELESAI
Tujuan: satu tombol untuk beralih antara **data asli rCFD** (sekarang default) dan
**model bersih** ala Flow Intuition (vortex super-crisp, slider-driven). Dua-duanya
dalam satu tampilan. (Langkah di bawah sudah diimplementasikan + diverifikasi.)

Modal jalur "model" SEBENARNYA SUDAH ADA di kode — semua sub-modul (streamlines,
glyphs, slice, jet-gpu) otomatis pakai model analitik `jet-field.js makeField()`
kalau `field` di-pass `null`. Jadi tinggal expose switch-nya.

Langkah:
1. **`viewer3d.js`** — di `createViewer`, simpan `realField` (sudah ada dari
   `loadRealField`). Tambah fungsi publik `setSource('real'|'model')` yang:
   - `streams.setField(real ? realField : null)`  (sudah ada `setField`, otomatis rebuild)
   - `glyphs.setField(...)` + `slice.setField(...)` (cek/ tambah `setField` kalau belum)
   - untuk **jet-gpu**: butuh switch `uHasField` + texture. Paling bersih: tambah
     method `jet.setField(tex|null, umax)` di `simulation/jet-gpu.js` yang set
     `uniforms.uHasField.value` + `uniforms.uField.value`. Lalu di model mode pass
     `null` (uHasField=0 → jalur analitik slider). Saat model mode, naikkan lagi
     `uAlpha` ke ~1 biar partikel model yang crisp jadi hero.
   - return `setSource` di object publik (sejajar `setFieldMode`).
2. **`index.html`** — tambah 1 chip toggle dekat `#m3dModes` (mis. `#m3dSource`
   dengan 2 tombol "rCFD data" / "Model"). Ikuti pola tombol `#m3dGlyphs`.
3. **`app.js`** — wire di `buildModel3DUI()` (lihat pola `gBtn`/`sBtn` di sekitar
   baris 364-380). On click → `STATE.viewer3d.setSource(...)`. Update juga label
   provenance di legend (`applyLegend`) biar jujur: "rCFD data" vs "Model
   (analytic, laminar)".
4. Update foot label (`onMode`) sesuai source aktif.

Acceptance: toggle bolak-balik real↔model, real = field asli (sedikit
"berantakan" tapi on-data), model = vortex bersih + slider Flow berpengaruh.
Provenance label ikut berubah (jangan klaim model = data).

---

## Task B — Partikel comet-streak (jejak mengorbit vortex)
Tujuan: partikel meninggalkan **trail pendek** mengikuti aliran → mengorbit vortex
= terasa hidup SEKALIGUS mengungkap pusaran lewat jejak (bukan cuma titik ujung
pathline seperti sekarang).

Pendekatan (stateless, tetap di GPU, di `simulation/jet-gpu.js`):
- Ganti `THREE.Points` → `THREE.LineSegments`. Per partikel = **2 vertex**
  (head + tail). Geometri jadi `2*MAX` vertex; duplikasi attribute
  `aSeed/aSeed2/aLane/aKind`, tambah attribute `aEnd` (0 = tail, 1 = head).
- Di vertex shader, hitung pathline seperti sekarang. **Head** di `ph` langkah
  integrasi; **tail** di `(ph - dTrail)` langkah (mis. `dTrail ≈ 0.05`). Untuk
  jalur real-field: loop adveksi sampai jumlah langkah masing-masing. Untuk jalur
  analitik: evaluasi posisi closed-form di dua fase.
- Warna/alpha fade sepanjang streak (`aEnd` → tail lebih redup). Tetap additive +
  `uAlpha` per-instance.
- LOD (`makeLOD`/`setCount`) tetap pakai `setDrawRange` tapi ingat sekarang
  unit-nya 2 vertex/partikel.
- Hati-hati: engine ini DIPAKAI BERSAMA Flow panel (`flow-sim.js`). Pastikan dua
  path (real + analitik) sama-sama benar, atau gate streak khusus real-field via
  uniform biar Flow panel tak berubah kalau belum siap.

Acceptance: partikel jadi garis pendek mengalir; di vortex terlihat melingkar;
fps tetap aman di mobile (cek `makeLOD`); Flow Intuition panel tidak rusak.

---

Referensi cepat:
- Vortex render fix terakhir: `viewer3d.js buildLiveScene`, `simulation/streamlines.js`,
  `simulation/jet-gpu.js` (uAlpha) — commit `456d8a2`.
- Data asli: `data/cfd_field.json` (64×64, u/v m/s + T K, symmetry plane).
- Catatan presentasi: `docs/PRESENTATION_NOTES.md`. Roadmap Step 2: `docs/STEP2_HEATLOSS.md`.
