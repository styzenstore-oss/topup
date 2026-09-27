import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { isAdminAuthed } from "../../../../lib/adminAuth";

function unauthorized() {
  return NextResponse.json({ success: false, message: "Tidak berwenang" }, { status: 401 });
}

// GET /api/admin/orders?status=pending&limit=50
export async function GET(req) {
  if (!isAdminAuthed()) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // filter by topup_status, opsional
  const limit = Number(searchParams.get("limit") || 50);

  let query = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status) query = query.eq("topup_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data });
}

// PATCH /api/admin/orders  { refId, topup_status?, serial_number? }
// Untuk kasus manual: misal topup gagal otomatis tapi sudah diproses manual
// oleh admin, atau perlu update SN secara manual.
export async function PATCH(req) {
  if (!isAdminAuthed()) return unauthorized();

  const { refId, topup_status, serial_number } = await req.json();
  if (!refId) {
    return NextResponse.json({ success: false, message: "refId wajib diisi" }, { status: 400 });
  }

  const update = { updated_at: new Date().toISOString() };
  if (topup_status) update.topup_status = topup_status;
  if (serial_number !== undefined) update.serial_number = serial_number;

  const { error } = await supabaseAdmin.from("orders").update(update).eq("ref_id", refId);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
