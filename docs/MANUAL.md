# Manual Teacher OS

Panduan pengguna (guru) + tutorial instalasi (operator). Bahasa Indonesia.

---

## BAGIAN A — TUTORIAL INSTALASI

### A.1. Yang dibutuhkan

| Kebutuhan | Keterangan |
|---|---|
| Komputer | Windows/macOS/Linux |
| Node.js 20+ | Cek: `node -v`. Unduh di nodejs.org bila belum ada |
| npm 10+ | Biasanya ikut Node.js. Cek: `npm -v` |
| Browser | Chrome/Edge/Firefox terbaru |
| Akun Supabase | Gratis di supabase.com (hanya untuk instalasi penuh) |
| Git | Hanya untuk clone dari GitHub |

### A.2. Instalasi cepat (tanpa database, ±5 menit)

```bash
git clone https://github.com/ichreza87/teacher-os.git
cd teacher-os
cp .env.example .env        # Windows PowerShell: copy .env.example .env
npm install
npm run dev -- --port 3100
```

Buka `http://localhost:3100/login`, klik **Masuk Demo** (user `admin`, password `admin`).
Anda langsung masuk dashboard contoh. Port 3000 sering dipakai aplikasi lain,
jadi panduan ini memakai 3100 (boleh diganti).

> Mode demo memakai data contoh (bukan data nyata) dan selalu menampilkan banner
> kuning "Mode Demo". Matikan dengan `DEMO_MODE=false` di `.env`.

### A.3. Instalasi penuh (dengan database, ±20 menit)

1. **Buat project Supabase.** Daftar di supabase.com → New project → catat:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - anon public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Connection string (`DATABASE_URL`, menu Settings → Database).
2. **Aktifkan ekstensi vector.** Database → Extensions → cari `vector` → Enable.
   (Wajib untuk pencarian semantik Knowledge Base.)
3. **Isi `.env`.** Salin `.env.example` menjadi `.env`, isi 3 nilai di atas.
4. **Migrasi + seed (satu perintah).**
   ```bash
   npm run db:setup
   ```
   Perintah lain: `npm run db:migrate` (migrasi saja), `npm run db:seed` (seed saja),
   `npm run db:reset -- --yes` (HAPUS semua data — wajib flag `--yes`).
5. **Buat akun guru.** Supabase Dashboard → Authentication → Add user (buat 3 user),
   lalu hubungkan ke data contoh:
   ```sql
   update teachers set user_id = '<auth-user-uuid>' where id = '<teacher-uuid>';
   ```
6. **Jalankan.** `npm run dev -- --port 3100` → login dengan email terdaftar →
   lengkapi **Onboarding** (8 langkah) → dashboard nyata terbentuk.

### A.4. Login Belajar.id (opsional)

1. Google Cloud Console → buat OAuth client (Web). Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → aktifkan **Google**, isi Client ID + Secret.
3. Tombol **Masuk dengan Belajar.id (Google)** di `/login` menjadi aktif.
   Hanya email `@...belajar.id` (termasuk subdomain `guru.sma.`, `guru.sd.`, ...)
   yang diterima; akun lain otomatis dikeluarkan.

### A.5. Integrasi opsional (boleh nanti)

| Integrasi | Caranya | Kegunaan |
|---|---|---|
| S3 storage | Isi `S3_*` di `.env` | Simpan berkas asli Knowledge Base (tanpa ini memakai Supabase Storage) |
| Notion | Buat integration, isi `NOTION_*`, redirect `.../api/integrations/notion/callback` | Impor halaman, export konten |
| Google Workspace | OAuth client + `GOOGLE_*`, redirect `.../api/integrations/google/callback` | Export Drive/Docs/Sheets/Calendar |
| AI provider | `AI_API_KEY` + pilih model di AI Settings | Jawaban AI nyata (default Mock offline) |
| PostHog | Isi `POSTHOG_KEY` | Analitik produk tanpa data siswa |

Token OAuth disimpan terenkripsi (`APP_ENCRYPTION_KEY`); tanpa key ini,
fitur connect menampilkan pesan jujur, bukan error misterius.

### A.6. Troubleshooting instalasi

| Gejala | Solusi |
|---|---|
| `EADDRINUSE` port 3100 | Ganti port: `npm run dev -- --port 3101` |
| `DATABASE_URL belum diisi` | Isi `.env` (bukan `.env.example`) |
| Migrasi gagal di 0004 | Aktifkan ekstensi `vector` dulu (A.3 langkah 2) |
| `next build` kehabisan memori | Tutup aplikasi berat; build butuh ~1 GB RAM bebas |
| `npm test` gagal spawn | Sudah ditangani: test memakai pool `vmThreads` |
| Halaman menampilkan "Supabase belum dikonfigurasi" | Normal tanpa `.env` — gunakan login demo atau lengkapi A.3 |
| Login Google error `redirect_uri_mismatch` | Tambahkan redirect URI persis seperti A.4 di Google Cloud Console |

---

## BAGIAN B — MANUAL PENGGUNA (GURU)

### B.1. Masuk dan onboarding

1. Buka aplikasi → `/login`. Pilih: **Masuk Demo** (coba-coba), email terdaftar,
   atau **Belajar.id**.
2. **Onboarding** (8 langkah): nama → jenjang → sekolah → mapel/peran → kelas →
   kurikulum → tahun ajaran → AI provider. Selesai → ringkasan "Your Teaching Context".

### B.2. Dashboard (Beranda)

- **Kartu angka**: kelas, siswa aktif, tugas & ujian, notifikasi.
- **Jadwal Hari Ini** (dari Calendar) dan **Tugas & Agenda** (dari Tasks).
- **Grafik Perkembangan Siswa** dan **Pengumuman** (dari School).
- **AI Insights**: siswa tanpa kelas, kelas tanpa wali, asesmen belum lengkap.
- **Aksi cepat** dan **Otomatisasi** (saran yang bisa dimatikan di School → Otomatisasi).

### B.3. Alur kerja inti (disarankan berurutan)

1. **Students & Classes.** Tambah siswa (cari, profil, ortu/wali) → buat kelas →
   daftarkan siswa dari detail kelas.
2. **Planning.** Buat modul ajar (mapel, topik, tujuan, aktivitas, jumlah pertemuan).
   Detail modul menampilkan materi & asesmen terkait otomatis.
3. **Materials.** Tambah materi (dokumen/video/tautan, boleh ditautkan ke modul).
4. **Question Bank.** Buat bank soal → tambah soal (tipe, sulit, level Bloom, kunci,
   pembahasan). Soal identik otomatis ditolak sebagai duplikat.
5. **Assessment.** Buat asesmen (wajib pilih kelas, opsional modul) → isi nilai di
   gradebook (validasi 0–skor maks, rata-rata otomatis) + umpan balik per siswa.
6. **Tasks & Calendar.** Tugas pribadi (To Do → In Progress → Done, hapus wajib
   centang konfirmasi) dan agenda (validasi waktu selesai > mulai).
7. **Knowledge Base.** Upload PDF/DOCX/TXT/MD/CSV/XLSX (maks 10 MB) → teks
   diekstrak, dipotong, di-embedding → bisa dicari semantik + dipakai AI menjawab
   dengan sitasi sumber.
8. **AI Workspace** (tombol `Ctrl+K` dari mana saja). Contoh perintah:
   - "Buatkan soal IPA kelas 5 tentang ekosistem" → klarifikasi bila kurang info →
     pratinjau usulan → **Setujui** (tersimpan) / Tolak.
   - "Ingatkan saya memeriksa ulangan besok", "Jadwalkan rapat Jumat 10:00".
   - Tanya jawab umum memakai Knowledge Base bila relevan (ada sitasi).
   - Balasan AI bisa **disimpan sebagai materi**. AI tidak pernah mengubah data
     tanpa persetujuan Anda.
9. **Communication.** Direktori ortu/wali → template pesan (`{{nama_siswa}}` dkk,
   placeholder kosong diperingatkan) → tulis draf (isi otomatis dari data siswa) →
   **Setujui** → kirim manual via WhatsApp → **Tandai Terkirim**. Tidak ada kirim otomatis.
10. **Professional & School.** Catat pelatihan/sertifikasi (portfolio otomatis),
    dokumen sekolah (kebijakan, notulen, inventaris), dan aturan otomatisasi.

### B.4. Aturan main yang perlu diketahui guru

- **Data aman bertingkat**: guru hanya melihat data sekolahnya (RLS); tugas dan
  pengetahuan bersifat pribadi.
- **AI membantu, guru memutuskan**: nilai akhir, pesan ke ortu, dan penghapusan
  selalu butuh persetujuan eksplisit.
- **Mode demo vs nyata**: banner kuning = data contoh. Data nyata hanya muncul
  setelah instalasi penuh (Bagian A.3).
- **Privasi siswa**: nama/NISN/nilai tidak pernah dikirim ke analitik; kunci API
  dan token hanya di server.

### B.5. FAQ singkat

- *Apakah bisa offline?* Belum — butuh localhost + (untuk data nyata) Supabase.
- *Apakah ada aplikasi HP?* Belum; tampilan mobile tetap bisa dipakai untuk baca.
- *Kurikulum selain Merdeka?* Bisa — kurikulum hanya isian teks + konfigurasi
  jenjang, tidak di-hard-code.
- *Data hilang setelah reset?* Ya bila `db:reset -- --yes` dijalankan. Backup
  via dashboard Supabase (Database → Backups) sebelum eksperimen berisiko.
