# TABE PALU — Google Sheets + Cloudflare Pages Functions

## Arsitektur
Browser -> Cloudflare Pages `/api/*` -> Google Apps Script Web App -> Google Sheets.

Rahasia API tidak pernah ditanam di HTML/JavaScript browser.

## 1. Google Apps Script
1. Buka spreadsheet database TABE PALU > Extensions/Ekstensi > Apps Script.
2. Ganti isi `Code.gs` dengan file `google-apps-script/Code.gs`.
3. Simpan.
4. Project Settings / Setelan Project > Script Properties > Add script property:
   - Property: `API_SECRET`
   - Value: buat string acak panjang (minimal 32 karakter). Simpan baik-baik.
5. Deploy > Manage deployments > Edit Web app > New version > Deploy.
6. Execute as: Me; Who has access: Anyone.
7. Salin URL Web App yang berakhir `/exec` (tanpa `?action=...`).

## 2. GitHub
Unggah seluruh isi folder `TABE_PALU_GITHUB_READY` ke root repositori `tabe-palu`, termasuk folder `functions` dan `public`.
Jangan hanya mengunggah `index.html`; folder `functions/api/[[path]].js` wajib ikut.

## 3. Cloudflare Pages
Project > Settings > Environment variables:
- `GAS_WEB_APP_URL` = URL Web App Apps Script yang berakhir `/exec`, tanpa query.
- `TABE_API_SECRET` = nilai yang sama persis dengan Script Property `API_SECRET`.
- `TABE_ADMIN_PIN` = PIN admin website yang dipakai untuk login. Default website lama adalah `admin123` jika belum pernah diganti. Sebaiknya ganti PIN admin pada website dan samakan nilainya dengan secret ini.
Tambahkan ketiganya untuk Production (dan Preview bila diperlukan). Tandai `TABE_API_SECRET` dan `TABE_ADMIN_PIN` sebagai Secret/encrypted.
Lalu Trigger deployment baru.

Build settings:
- Framework preset: None
- Build command: kosong
- Build output directory: `public`
- Root directory: kosong.

## 4. Tes
Setelah deployment:
- Buka `https://DOMAIN-ANDA/api/attractions` — harus mengembalikan `result: success`, `sheet: OBJEK_WISATA`.
- Buka `https://DOMAIN-ANDA/api/visits` — harus mengembalikan `result: success`, `sheet: DATA_KUNJUNGAN`.
- Kirim satu kunjungan uji dari formulir; pastikan masuk ke `DATA_KUNJUNGAN`.
- Ubah kategori objek wisata dari admin; pastikan nilai di `OBJEK_WISATA` berubah dan terlihat dari HP/perangkat lain.

## Catatan
- Jangan masukkan secret ke HTML, GitHub, atau browser.
- Jangan hapus data lokal lama dari HP sebelum menyalin/menyelamatkan kunjungan yang belum tersinkron.
- Perubahan ini mengubah jalur API menjadi same-origin `/api`; Apps Script tetap hanya diakses dari Cloudflare Function.
