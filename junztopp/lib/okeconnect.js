/**
 * Adapter integrasi OkeConnect (H2H) — sumber produk & eksekusi topup game.
 *
 * Field/endpoint di bawah ini sudah dikonfirmasi dari data nyata:
 * - Daftar harga PUBLIK (tanpa login) tersedia di:
 *   https://okeconnect.com/harga/json?id=<PRICE_ID>
 *   dengan field: kode, keterangan, produk, kategori, harga, status ("1"/"0")
 *   (PRICE_ID kamu: 905ccd028329b0a — sudah diisi di .env sebagai OKECONNECT_PRICE_ID)
 * - Transaksi H2H (butuh Member ID + PIN + Password, base URL
 *   https://h2h.okeconnect.com, wajib whitelist IP server di
 *   https://okeconnect.com/integrasi/pin) memakai skema umum:
 *   produk (kode), tujuan (nomor/ID game), ref_id (ID unik dari sistem kita).
 *   Respons berisi: transactionId/trx_id, refId/ref_id, status, statusText,
 *   serialNumber/sn, message, balanceBefore, balanceAfter, price.
 *
 * OkeConnect tidak mempublikasikan dokumentasi transaksi H2H secara resmi ke
 * publik, jadi bagian TRANSAKSI (bukan daftar harga) tetap ditandai sebagai
 * "pola umum integrator" — kalau di dashboardmu ada perbedaan nama parameter,
 * cukup sesuaikan di sini saja.
 */

const BASE_URL = process.env.OKECONNECT_BASE_URL || "https://h2h.okeconnect.com";
const MEMBER_ID = process.env.OKECONNECT_MEMBER_ID;
const PIN = process.env.OKECONNECT_PIN;
const PASSWORD = process.env.OKECONNECT_PASSWORD;
const PRICE_ID = process.env.OKECONNECT_PRICE_ID;

function authParams() {
  return { memberID: MEMBER_ID, pin: PIN, password: PASSWORD };
}

function buildUrl(base, path, params) {
  const url = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  return url.toString();
}

async function okeFetch(path, params) {
  const url = buildUrl(BASE_URL, path, { ...authParams(), ...params });
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // OkeConnect kadang membalas teks polos (bukan JSON) untuk error tertentu
    data = { raw: text };
  }
  return { httpStatus: res.status, data };
}

/** Cek saldo akun OkeConnect — juga berguna untuk tahu IP publik server kamu
 *  (biar tahu IP mana yang perlu di-whitelist di dashboard OkeConnect). */
export async function getBalance() {
  return okeFetch("/api/v1/get-balance", {});
}

/**
 * Ambil seluruh daftar harga/produk dari OkeConnect.
 * Endpoint ini PUBLIK (tidak butuh memberID/pin/password), memakai
 * OKECONNECT_PRICE_ID dari .env. Field asli: kode, keterangan, produk,
 * kategori, harga, status.
 */
export async function getProducts() {
  const url = `https://okeconnect.com/harga/json?id=${PRICE_ID}`;
  const res = await fetch(url, { cache: "no-store" });
  const list = await res.json();
  return list.map((p) => ({
    code: p.kode,
    name: p.keterangan,       // deskripsi detail, misal "86 (78+8) Diamond Mobile Legend"
    productType: p.produk,    // nama produk umum, misal "TPG Diamond Mobile Legends"
    category: p.kategori,     // misal "DIGITAL", "PULSA", "TOKEN PLN"
    price: Number(p.harga),
    isActive: p.status === "1",
  }));
}

/**
 * Buat transaksi topup.
 * @param {string} productCode kode produk OkeConnect, contoh "DML86"
 * @param {string} destination nomor tujuan / ID game (+ server ID bila perlu,
 *   umumnya digabung dalam satu string, contoh "123456789(1234)")
 * @param {string} referenceId ID unik dari sistem kita sendiri
 * @param {number} [amount] wajib diisi hanya untuk produk open-denomination
 */
export async function createTransaction(productCode, destination, referenceId, amount) {
  const { data } = await okeFetch("/trx", {
    produk: productCode,
    tujuan: destination,
    ref_id: referenceId,
    nominal: amount,
  });
  return normalizeTrx(data);
}

/**
 * Cek status transaksi yang sudah dibuat sebelumnya.
 * Catatan: beberapa implementasi H2H OkeConnect mewajibkan productCode &
 * destination dikirim ulang saat cek status (bukan cuma ref_id) — kirim
 * semuanya supaya aman di kedua skema.
 */
export async function checkStatus(productCode, destination, referenceId) {
  const { data } = await okeFetch("/trx/status", {
    produk: productCode,
    tujuan: destination,
    ref_id: referenceId,
  });
  return normalizeTrx(data);
}

function normalizeTrx(data) {
  const d = data?.data || data || {};
  return {
    transactionId: d.transactionId || d.trx_id || d.trxid,
    refId: d.refId || d.ref_id,
    status: (d.status || d.statusText || "").toString().toLowerCase(),
    message: d.message || d.statusText || "",
    serialNumber: d.serialNumber || d.sn || null,
    price: d.price,
    balanceBefore: d.balanceBefore,
    balanceAfter: d.balanceAfter,
    raw: data,
  };
}

/**
 * Verifikasi & uraikan payload callback status dari OkeConnect.
 *
 * PENTING: beberapa implementasi H2H OkeConnect mengirim callback bukan
 * sebagai field JSON terpisah, melainkan SATU parameter "message" berisi
 * teks gabungan gaya "TRXID:xxx. REFID:xxx. SUKSES, SN:xxx. HRG:xxx." mirip
 * notifikasi SMS gateway pulsa lama. Fungsi ini menangani KEDUA kemungkinan:
 * field terpisah (ref_id, status, sn, ...) ATAU satu string "message" yang
 * di-parse pakai regex. Kalau ternyata payload asli beda format, cukup
 * sesuaikan regex di bawah — bagian lain aplikasi tidak perlu diubah.
 */
export function parseCallback(payload) {
  // Skema A: field sudah terpisah
  if (payload.ref_id || payload.refID || payload.refId) {
    const status = (payload.status || payload.statusText || "").toString().toLowerCase();
    return {
      referenceId: payload.ref_id || payload.refID || payload.refId,
      status,
      sn: payload.sn || payload.serial_number || payload.serialNumber || null,
      raw: payload,
    };
  }

  // Skema B: satu string gabungan di field "message"
  const message = (payload.message || "").toString();
  const get = (label) => {
    const m = message.match(new RegExp(`${label}[:\\s]+([^.\\n]+)`, "i"));
    return m ? m[1].trim() : null;
  };

  const statusRaw = message.toLowerCase();
  let status = "processing";
  if (statusRaw.includes("sukses") || statusRaw.includes("success")) status = "sukses";
  else if (statusRaw.includes("gagal") || statusRaw.includes("failed")) status = "gagal";

  return {
    referenceId: get("REFID") || get("REF_ID"),
    status,
    sn: get("SN"),
    raw: payload,
  };
}
