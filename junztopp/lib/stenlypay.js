import crypto from "crypto";

/**
 * Adapter payment gateway StenlyPay.
 *
 * !! CATATAN PENTING !!
 * Claude tidak menemukan dokumentasi API publik resmi dari stenlypay.id.
 * TAPI format key yang kamu kasih:
 *   sk_live_..., pk_live_..., whsec_...
 * itu PERSIS format penamaan Stripe (secret key, publishable key, webhook
 * signing secret). Ini pola yang sangat umum ditiru oleh banyak payment
 * gateway lokal yang membangun API "ala Stripe" (Checkout Session + webhook
 * bertanda tangan HMAC-SHA256 dengan header berformat "t=<timestamp>,
 * v1=<signature>"). Kode di bawah ini saya tulis mengikuti pola tersebut
 * supaya besar kemungkinan langsung nyambung — tapi TETAP verifikasi ke
 * dashboard/dokumentasi StenlyPay kamu, terutama untuk:
 *   1. Path endpoint pastinya (saya asumsikan /v1/checkout/sessions)
 *   2. Nama header signature webhook (saya asumsikan "Stenlypay-Signature")
 *   3. Nama field response (payment_url/checkout_url, dsb — sudah saya
 *      buat fleksibel dengan beberapa fallback nama field)
 * Semua titik itu ditandai komentar TODO.
 */

const BASE_URL = process.env.STENLYPAY_BASE_URL || "https://api.stenlypay.id";
const SECRET_KEY = process.env.STENLYPAY_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STENLYPAY_WEBHOOK_SECRET;

/**
 * Membuat sesi pembayaran (checkout session) baru di StenlyPay.
 * @param {object} params
 * @param {string} params.merchantRef ID unik order dari sistem kita
 * @param {number} params.amount total tagihan (Rupiah)
 * @param {string} params.customerName
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerPhone]
 * @param {string} params.productName nama produk yang dibeli
 */
export async function createPaymentLink({
  merchantRef,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  productName,
}) {
  // TODO: cocokkan path endpoint ini ("/v1/checkout/sessions") dengan
  // dokumentasi asli StenlyPay begitu kamu dapat aksesnya.
  const res = await fetch(`${BASE_URL}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Pola Stripe-like: secret key dikirim sebagai Bearer token.
      Authorization: `Bearer ${SECRET_KEY}`,
    },
    body: JSON.stringify({
      reference_id: merchantRef,
      amount,
      currency: "IDR",
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      description: productName,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/riwayat`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/riwayat`,
      webhook_url: process.env.STENLYPAY_CALLBACK_URL,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "Gagal membuat sesi pembayaran StenlyPay");
  }

  // Beberapa kemungkinan nama field response, disesuaikan begitu kamu tahu bentuk aslinya.
  const paymentUrl = data.url || data.payment_url || data.checkout_url || data.data?.url;
  const trxId = data.id || data.session_id || data.data?.id;

  if (!paymentUrl) {
    throw new Error("Response StenlyPay tidak mengandung URL pembayaran — cek bentuk respons asli di lib/stenlypay.js");
  }

  return { paymentUrl, trxId, raw: data };
}

/**
 * Verifikasi signature webhook StenlyPay (pola Stripe-style).
 * Header signature diasumsikan berformat: "t=<timestamp>,v1=<hex-hmac>"
 * dihitung dari HMAC-SHA256("<timestamp>.<raw body JSON>", WEBHOOK_SECRET).
 *
 * @param {string} rawBody isi body request APA ADANYA (string, sebelum di-JSON.parse)
 * @param {string} signatureHeader isi header signature dari request
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;

  // TODO: cek nama pemisah field di header asli StenlyPay — asumsi format
  // Stripe: "t=1690000000,v1=abcdef123..."
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => kv.trim().split("="))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false; // panjang buffer beda -> pasti tidak valid
  }
}

/**
 * Uraikan payload webhook StenlyPay setelah signature terverifikasi.
 * TODO: sesuaikan nama field status & jumlah sesuai dokumentasi asli.
 */
export function parseWebhookPayload(payload) {
  return {
    merchantRef: payload.reference_id || payload.merchant_ref || payload.data?.reference_id,
    status: (payload.status || payload.type || payload.data?.status || "").toString().toLowerCase(),
    amount: payload.amount || payload.data?.amount,
    raw: payload,
  };
}
