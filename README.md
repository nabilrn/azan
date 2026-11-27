# Ruang Salat

Dashboard waktu salat Jakarta Selatan (WIB), dengan hitung mundur, cuaca TB Simatupang, dan mode azan.

## Struktur proyek

```
index.html           # Struktur halaman dan dialog
css/
  sky.css            # Referensi gambar langit
  base.css           # Token, komponen dasar, tema awal
  dashboard.css      # Layout dashboard dan breakpoint
  scenes.css         # Panorama normal dan Ashar
  azan.css           # Tampilan ketika azan
js/
  config.js          # Konfigurasi, preset, state
  main.js            # Bootstrap dan event global
  schedule.js        # Fetch, cache, jadwal dan countdown
  audio.js           # Playback, pengaturan dan mode azan
  audio-cache.js     # IndexedDB dan prefetch rekaman
  ui.js              # Toast, jam dan overlay
  weather.js         # Cuaca dan fase matahari
assets/
  sky/               # Gambar cuaca WebP
  *.webp             # Panorama dashboard
```

## Menjalankan secara lokal

Tidak membutuhkan npm atau build step. Gunakan HTTP server agar ES modules bisa dimuat:

```sh
python -m http.server 8000
```

Buka http://localhost:8000. Untuk deployment, GitHub Pages dapat menyajikan direktori root langsung.

## Data dan audio

- Jadwal Sajadah (Kemenag) dengan fallback myQuran, disimpan di localStorage.
- Rekaman yang berhasil diunduh dari host audio disimpan di IndexedDB. CORS, kuota browser, dan izin autoplay tetap berlaku.
- Aktifkan suara melalui tombol dashboard dan biarkan tab terbuka.
- Cuaca menggunakan Open-Meteo. Tidak meminta lokasi perangkat.
- Foto versi 2 (panorama Ashar) dipakai saat menunggu Ashar atau Maghrib, dan selama mode azan.
