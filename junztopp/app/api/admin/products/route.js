import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { isAdminAuthed } from "../../../../lib/adminAuth";

function unauthorized() {
  return NextResponse.json({ success: false, message: "Tidak berwenang" }, { status: 401 });
}

// GET /api/admin/products -> semua produk termasuk yang nonaktif
export async function GET() {
  if (!isAdminAuthed()) return unauthorized();

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("category", { ascending: true });

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

// PATCH /api/admin/products  { code, sell_price?, is_active? }
export async function PATCH(req) {
  if (!isAdminAuthed()) return unauthorized();

  const { code, sell_price, is_active } = await req.json();
  if (!code) {
    return NextResponse.json({ success: false, message: "code wajib diisi" }, { status: 400 });
  }

  const update = { updated_at: new Date().toISOString() };
  if (sell_price !== undefined) update.sell_price = sell_price;
  if (is_active !== undefined) update.is_active = is_active;

  const { error } = await supabaseAdmin.from("products").update(update).eq("code", code);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
