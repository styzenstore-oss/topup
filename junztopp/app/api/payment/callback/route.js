import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifyWebhookSignature, parseWebhookPayload } from "../../../../lib/stenlypay";
import { createTransaction } from "../../../../lib/okeconnect";

// POST /api/payment/callback
// Endpoint ini yang didaftarkan sebagai "webhook URL" di dashboard StenlyPay.
export async function POST(req) {
  try {
    // Signature diverifikasi dari RAW body (string apa adanya), bukan dari
    // hasil parse JSON — karena itu kita baca .text() dulu, baru di-parse.
    const rawBody = await req.text();
    // TODO: sesuaikan nama header ini ("stenlypay-signature") dengan yang
    // benar-benar dikirim StenlyPay (cek di log request pertama yang masuk).
    const signatureHeader =
      req.headers.get("stenlypay-signature") || req.headers.get("x-stenlypay-signature");

    const isValid = verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      return NextResponse.json({ success: false, message: "Signature tidak valid" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const callback = parseWebhookPayload(payload);

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("ref_id", callback.merchantRef)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
    }

    // Kalau sudah pernah diproses sebelumnya, jangan diproses dobel.
    if (order.payment_status === "paid") {
      return NextResponse.json({ success: true, message: "Sudah diproses sebelumnya" });
    }

    if (callback.status.includes("paid") || callback.status.includes("success") || callback.status.includes("completed")) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "paid", topup_status: "processing", updated_at: new Date().toISOString() })
        .eq("ref_id", order.ref_id);

      // Setelah pembayaran sukses, langsung eksekusi topup ke OkeConnect.
      const trx = await createTransaction(order.product_code, order.destination, order.ref_id);

      const isSuccess = trx.status.includes("sukses") || trx.status.includes("success");

      await supabaseAdmin
        .from("orders")
        .update({
          topup_status: isSuccess ? "success" : "processing",
          serial_number: trx.serialNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("ref_id", order.ref_id);
    } else if (callback.status.includes("expired") || callback.status.includes("failed") || callback.status.includes("cancel")) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed", topup_status: "failed", updated_at: new Date().toISOString() })
        .eq("ref_id", order.ref_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
