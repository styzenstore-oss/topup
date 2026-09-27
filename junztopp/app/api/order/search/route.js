import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// GET /api/order/search?contact=08123xxxx
// Dipakai di halaman /riwayat untuk pembeli guest (tanpa login) mengecek
// status pesanannya sendiri berdasarkan kontak yang diisi saat checkout.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const contact = searchParams.get("contact");

  if (!contact) {
    return NextResponse.json({ success: false, message: "contact wajib diisi" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("guest_contact", contact)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
