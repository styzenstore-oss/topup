# JunzTopp — Website Topup Game

Stack: **Next.js 14 (App Router)** + **Supabase** (auth, database) +
**OkeConnect** (sumber produk & eksekusi topup) + **StenlyPay** (payment gateway).

---

## 1. Apa yang sudah jadi

- Katalog produk (`/`) — produk kategori DIGITAL (voucher game, diamond ML,
  UC PUBG, dll) diambil dari Supabase, yang disinkron dari daftar harga
  publik OkeConnect.
- Checkout (`/checkout?code=...`) — isi ID game, dapat link pembayaran StenlyPay.
- Riwayat pembelian (`/riwayat`) — bisa dicek dengan akun login **atau**
  tanpa login (guest) memakai kontak WA/email yang diisi saat checkout.
- Login/Register opsional (`/login`, `/register`) pakai Supabase Auth.
- **Admin Dashboard** (`/admin`, login di `/admin/login`):
  - Statistik ringkas: order dibayar, topup sukses, yang masih diproses, omzet hari ini
  - Tab **Pesanan**: lihat semua order, tandai manual sukses/gagal kalau perlu
  - Tab **Produk**: lihat semua produk (termasuk nonaktif), ubah harga jual per produk, aktif/nonaktifkan produk
  - Tombol sinkron ulang produk dari OkeConnect
- Webhook pembayaran (`/api/payment/callback`) — begitu StenlyPay konfirmasi
  lunas, sistem otomatis mengeksekusi transaksi ke OkeConnect.
- Webhook status topup (`/api/okeconnect/status`) — update status/SN kalau
  OkeConnect memberi tahu progres transaksi belakangan.

## 2. Yang sudah diisi otomatis vs yang PERLU kamu lengkapi

`.env.local` di dalam folder ini sudah saya isi dengan kredensial yang kamu
berikan. Berikut status tiap bagian:

### a. OkeConnect — SEBAGIAN sudah, SEBAGIAN masih kosong
- ✅ **Daftar harga produk** (`OKECONNECT_PRICE_ID=905ccd028329b0a`) — ini
  yang kamu kasih linknya (`okeconnect.com/harga/json?id=...`), sudah
  dipakai untuk sinkron katalog produk. Ini bersifat PUBLIK, tidak butuh login.
- ❌ **Kredensial transaksi H2H** (`OKECONNECT_MEMBER_ID`, `OKECONNECT_PIN`,
  `OKECONNECT_PASSWORD`) — **INI BEDA** dari ID daftar harga di atas, dan
  **belum kamu berikan**. Tanpa ini, katalog produk bisa tampil tapi tombol
  "Bayar" tidak akan bisa benar-benar mengeksekusi topup ke OkeConnect.
  Cara dapatnya:
  1. Buka https://okeconnect.com/integrasi/trx_ip → catat **Member ID** dan
     **Password akun**.
  2. Buka https://okeconnect.com/integrasi/pin → buat **PIN H2H**, dan
     **whitelist IP server** kamu (kalau pakai Vercel dengan IP dinamis,
     biasanya perlu cek opsi IP statis/NAT dari OkeConnect — tanyakan ke
     admin OkeConnect caranya untuk hosting serverless).
  3. Isi ketiganya di Environment Variables Vercel (`OKECONNECT_MEMBER_ID`,
     `OKECONNECT_PIN`, `OKECONNECT_PASSWORD`).
  4. Set callback URL transaksi di dashboard OkeConnect ke:
     `https://domainkamu.vercel.app/api/okeconnect/status`

  Endpoint & format transaksi di `lib/okeconnect.js` sudah disusun mengikuti
  pola resmi yang dikonfirmasi dari package composer publik `okeconnect-php-client`
  (parameter `produk`, `tujuan`, `ref_id`; response berisi `status`,
  `serialNumber`, dll). Kalau di dashboardmu ternyata ada perbedaan nama
  parameter, cukup sesuaikan file itu.

### b. StenlyPay — sudah diisi, TAPI perlu verifikasi 1 hal
Saya tidak menemukan dokumentasi API publik resmi dari stenlypay.id. Tapi
format key yang kamu kasih (`sk_live_...`, `pk_live_...`, `whsec_...`) persis
mengikuti konvensi Stripe, yang banyak ditiru payment gateway lokal. Jadi
`lib/stenlypay.js` saya tulis mengikuti pola itu:
- Endpoint: `POST {STENLYPAY_BASE_URL}/v1/checkout/sessions`, auth `Bearer sk_live_...`
- Webhook signature: header berformat `t=<timestamp>,v1=<hmac-sha256 hex>`,
  dihitung dari `HMAC-SHA256("{timestamp}.{raw body}", whsec_...)`

**Yang perlu kamu cek di dashboard StenlyPay** (biasanya di menu Developer/API):
1. Base URL API yang benar (saya asumsikan `https://api.stenlypay.id`)
2. Path endpoint create transaksi yang benar (saya asumsikan `/v1/checkout/sessions`)
3. Nama header signature webhook (saya asumsikan `Stenlypay-Signature`)
4. Nama field response (sudah saya buat fleksibel dengan beberapa fallback)

Kalau kamu kirim saya screenshot/teks dokumentasi API asli dari dashboard
StenlyPay, saya langsung sesuaikan `lib/stenlypay.js` biar dijamin nyambung.

Daftarkan webhook URL di dashboard StenlyPay ke:
`https://domainkamu.vercel.app/api/payment/callback`

### c. Supabase
1. Buka project Supabase kamu → SQL Editor → jalankan isi file
   `supabase/schema.sql` untuk membuat tabel `products` dan `orders`.
2. Ambil **service role key** di Project Settings > API, isi ke
   `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` (masih kosong, wajib diisi).

### d. Admin Dashboard
`ADMIN_PASSWORD` di `.env.local` masih contoh (`ganti-password-ini-sekarang`)
— **wajib ganti** dengan password kuat sebelum online, karena ini satu-satunya
lapisan proteksi ke `/admin`.

## 3. Menjalankan di lokal

```bash
npm install
npm run dev
```

`.env.local` sudah ada dan sudah terisi sebagian — lengkapi dulu bagian yang
masih kosong di atas sebelum benar-benar transaksi jalan.

Buka http://localhost:3000 (katalog), http://localhost:3000/admin/login (admin)

## 4. Deploy ke Vercel

1. Push folder ini ke GitHub (repo baru). `.env.local` TIDAK akan ikut ke-push
   karena sudah masuk `.gitignore` — ini memang disengaja supaya kredensial
   tidak bocor ke publik.
2. Buka https://vercel.com/new, import repo tersebut.
3. Di halaman "Environment Variables", buka file `.env.local` di komputermu,
   copy-paste semua isinya ke situ (satu per satu, atau pakai fitur "paste .env").
4. Klik Deploy.
5. Setelah dapat domain (misal `junztopp.vercel.app`), update
   `NEXT_PUBLIC_SITE_URL`, `OKECONNECT_CALLBACK_URL`, `STENLYPAY_CALLBACK_URL`
   di Environment Variables Vercel supaya sesuai domain asli, lalu redeploy.
6. Daftarkan URL callback tersebut di dashboard OkeConnect & StenlyPay.

## 5. Struktur folder penting

```
lib/okeconnect.js          -> semua panggilan ke OkeConnect (harga & transaksi)
lib/stenlypay.js           -> semua panggilan ke StenlyPay
lib/adminAuth.js           -> cek sesi login admin
lib/supabaseAdmin.js       -> Supabase khusus server (service role)
lib/supabaseClient.js      -> Supabase untuk browser (anon key)
app/api/products/route.js  -> GET produk cache, POST sinkron dari OkeConnect
app/api/order/route.js     -> bikin order + link bayar
app/api/payment/callback/route.js  -> webhook StenlyPay -> trigger topup
app/api/okeconnect/status/route.js -> webhook status topup dari OkeConnect
app/api/admin/*            -> endpoint khusus admin (orders, products, login)
app/admin/                 -> halaman dashboard admin
supabase/schema.sql        -> skema tabel database
```

## 6. Mengubah margin harga jual

Cara termudah: buka `/admin` → tab **Produk** → edit langsung angka harga
jual per produk. Atau ubah margin default untuk sinkron berikutnya di
`app/api/products/route.js`, ubah nilai `DEFAULT_MARGIN`.

## 7. Kategori produk yang disinkron

Default hanya sinkron kategori `DIGITAL` (voucher game & sejenisnya), sesuai
tema "website topup game". Kalau suatu saat mau ikut jual pulsa/token
PLN/tagihan dari daftar harga OkeConnect yang sama, sinkron manual dengan
memanggil `POST /api/products?all=1` (atau tambahkan tombol khusus di admin).
