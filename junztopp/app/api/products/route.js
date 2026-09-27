import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getProducts } from "../../../lib/okeconnect";

// Margin default (Rupiah) yang ditambahkan ke harga modal OkeConnect
// kalau produk belum diatur manual di tabel `products`.
const DEFAULT_MARGIN = 500;

// GET /api/products -> ambil daftar produk aktif dari Supabase (cache)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

// POST /api/products -> sinkronisasi ulang produk dari OkeConnect ke Supabase
// Panggil endpoint ini dari halaman admin, atau jadwalkan lewat cron (misal
// Vercel Cron) setiap beberapa jam supaya harga selalu up to date.
//
// Default: hanya sinkron kategori "DIGITAL" (voucher game, diamond ML, UC
// PUBG, Steam, Google Play, dll — sesuai permintaan "website topup game").
// Kirim POST /api/products?all=1 kalau suatu saat mau ikutan sinkron semua
// produk PPOB (pulsa, token PLN, BPJS, PDAM, dst) dari OkeConnect.
export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("all") === "1";

    let list = await getProducts();
    if (!includeAll) {
      list = list.filter((p) => p.category === "DIGITAL");
    }

    if (!list || list.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada produk yang didapat dari OkeConnect" },
        { status: 502 }
      );
    }

    const rows = list.map((p) => ({
      code: p.code,
      category: p.category || "Lainnya",
      // Nama yang ditampilkan ke pembeli: gabungan nama produk umum + detail
      // deskripsi, contoh "TPG Diamond Mobile Legends - 86 (78+8) Diamond Mobile Legend"
      name: p.productType && p.productType !== p.name ? `${p.productType} - ${p.name}` : p.name,
      price: p.price,
      sell_price: p.price + DEFAULT_MARGIN,
      is_active: p.isActive,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("products").upsert(rows, { onConflict: "code" });
    if (error) throw error;

    return NextResponse.json({ success: true, synced: rows.length });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
