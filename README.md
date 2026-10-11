# Nota Flow

**Nota Flow** adalah web tool untuk membuat diagram perangkat lunak langsung di browser — tanpa
instalasi, tanpa backend, dan tanpa akun. Semua proses berjalan di sisi klien.

Mendukung lima jenis diagram:

| Jenis | Isi |
| --- | --- |
| **BPMN** | Start/intermediate/end event, 8 jenis task, 4 jenis gateway, pool, lane, data object, data store, group |
| **Use Case** | Aktor, use case, system boundary, relasi asosiasi, «include», «extend», generalisasi |
| **Activity Diagram** | Initial/final/flow final, action, decision, merge, fork, join, object node, partition (swimlane), send/receive signal, time event |
| **Class Diagram** | Class, interface, abstract class, enumeration, package (lengkap dengan atribut & metode) |
| **DFD** | Entitas eksternal, proses Gane-Sarson & Yourdon, dua gaya data store |

## Cara menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
```

Perintah lain:

```bash
npm run build      # build produksi ke folder dist/
npm run preview    # pratinjau hasil build
npm run typecheck  # pemeriksaan tipe TypeScript
npm test           # menjalankan seluruh pengujian (vitest + jsdom)
```

## Alur pemakaian

1. **Pilih jenis diagram** pada toolbar, lalu pilih template siap pakai di galeri (atau mulai dari
   kanvas kosong).
2. **Tambahkan elemen** dari panel stensil di kiri — klik untuk menaruh di tengah kanvas, atau
   seret langsung ke posisi yang diinginkan.
3. **Hubungkan elemen** dengan menarik dari titik di tepi elemen. Empat titik koneksi tersedia
   (atas, kanan, bawah, kiri) dan sisi yang paling masuk akal dipilih otomatis saat tata letak
   dirapikan.
4. **Atur detail** pada panel Properti di kanan: teks, warna, ukuran, gaya garis, ikon event,
   atribut/metode class, nomor proses DFD, dan jenis konektor beserta arah panahnya.
5. **Periksa aturan diagram** dengan tombol *Validasi* — Nota Flow memeriksa hal-hal seperti start
   event yang hilang, alur keluar dari end event, gateway buntu, use case di luar boundary, sampai
   aturan DFD (entitas eksternal tidak boleh terhubung langsung ke data store).
6. **Ekspor** ke PNG (1x/2x), SVG vektor, atau JSON yang bisa diimpor kembali.

## Pintasan papan tulis

| Tombol | Fungsi |
| --- | --- |
| Klik ganda | Ubah teks elemen langsung di kanvas |
| Shift + klik | Pilih beberapa elemen |
| Ctrl/⌘ + A / C / V / D | Pilih semua · salin · tempel · duplikat |
| Delete / Backspace | Hapus elemen terpilih |
| Ctrl/⌘ + Z / Shift + Z | Undo · Redo |
| L / T | Rapikan tata letak otomatis (kiri→kanan / atas→bawah) |
| H | Sesuaikan tampilan ke seluruh diagram |
| G | Tampilkan/sembunyikan grid |
| Ctrl/⌘ + S | Unduh berkas JSON |

## Arsitektur singkat

```
src/
├─ shapes/         # 52 stensil murni SVG (primitives + renderer) — dipakai kanvas DAN ekspor
├─ edges/          # konektor: jenis per diagram, penanda UML/BPMN, mesin geometri jalur
├─ lib/
│  ├─ layout.ts     # auto-layout dagre, penentuan sisi koneksi, perataan & penyebaran
│  ├─ validate.ts   # aturan tiap notasi diagram
│  ├─ templates.ts  # 9 template siap pakai
│  ├─ exporter.tsx  # render SVG lewat react-dom/server → PNG/SVG/JSON
│  └─ text.ts       # pengukuran teks (canvas) agar tampilan = hasil ekspor
├─ store/useDiagram.ts  # state zustand: dokumen, riwayat undo/redo, pilihan, clipboard
└─ components/     # toolbar, palet, inspector, kanvas, validasi, galeri template
```

Beberapa keputusan teknis yang penting:

- **Satu sumber kebenaran untuk visual.** Bentuk dan konektor digambar sebagai SVG biasa, sehingga
  hasil ekspor identik dengan yang terlihat di kanvas dan tidak bergantung pada posisi kursor.
- **Mesin geometri tanpa DOM.** Penempatan panah dan label konektor memakai perhitungan Bézier
  sendiri (`src/edges/geometry.ts`), sehingga ekspor bisa berjalan tanpa `getPointAtLength` dan
  tetap cepat saat ada banyak konektor.
- **Riwayat undo/redo berbasis snapshot** dengan penggabungan perubahan (debounce) untuk
  pengetikan, sehingga satu aksi tidak menghasilkan puluhan langkah undo.
- **Warna mengikuti mode terang/gelap** melalui `RenderTheme` yang sama untuk kanvas dan ekspor.

## Teknologi

React 19, TypeScript, Vite 7, Tailwind CSS 4, `@xyflow/react` (React Flow), zustand, dagre,
lucide-react.

## Pengujian

```bash
npm test
```

Mencakup: integritas seluruh stensil & jenis konektor, sembilan template (tanpa elemen bertumpuk,
tanpa error validasi), auto-layout & pemilihan sisi koneksi, aturan validasi per notasi,
operasi dokumen (tambah, sambung, duplikat, undo/redo, salin-tempel), round-trip JSON, hasil ekspor
SVG, serta interaksi UI (palet, galeri template, edit teks langsung, panel validasi).
