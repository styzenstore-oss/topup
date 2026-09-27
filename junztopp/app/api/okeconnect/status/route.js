import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { parseCallback } from "../../../../lib/okeconnect";

// Endpoint ini didaftarkan sebagai callback URL transaksi di dashboard
// OkeConnect (menu Integrasi > PIN). OkeConnect akan memanggil ini kalau
// status transaksi topup berubah (misal dari "processing" jadi "sukses").
async function handle(payload) {
  const callback = parseCallback(payload);
  if (!callback.referenceId) {
    return NextResponse.json({ success: false, message: "ref_id tidak ada di payload" }, { status: 400 });
  }

  const isSuccess = callback.status.includes("sukses") || callback.status.includes("success");
  const isFailed = callback.status.includes("gagal") || callback.status.includes("failed");

  await supabaseAdmin
    .from("orders")
    .update({
      topup_status: isSuccess ? "success" : isFailed ? "failed" : "processing",
      serial_number: callback.sn,
      updated_at: new Date().toISOString(),
    })
    .eq("ref_id", callback.referenceId);

  return NextResponse.json({ success: true });
}

export async function POST(req) {
  const payload = await req.json().catch(() => ({}));
  return handle(payload);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const payload = Object.fromEntries(searchParams.entries());
  return handle(payload);
}
