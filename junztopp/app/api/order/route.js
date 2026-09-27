import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { createPaymentLink } from "../../../lib/stenlypay";

// POST /api/order
// body: { productCode, destination, userId?, guestContact? }
export async function POST(req) {
  try {
    const body = await req.json();
    const { productCode, destination, userId, guestContact } = body;

    if (!productCode || !destination) {
      return NextResponse.json(
        { success: false, message: "productCode dan destination wajib diisi" },
        { status: 400 }
      );
    }
    if (!userId && !guestContact) {
      return NextResponse.json(
        { success: false, message: "Isi kontak (WA/email) untuk checkout tanpa login" },
        { status: 400 }
      );
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("code", productCode)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
    }

    const refId = `JZT-${Date.now()}-${randomUUID().slice(0, 6)}`;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        ref_id: refId,
        user_id: userId || null,
        guest_contact: guestContact || null,
        product_code: product.code,
        product_name: product.name,
        destination,
        price: product.sell_price,
        payment_status: "pending",
        topup_status: "waiting_payment",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const payment = await createPaymentLink({
      merchantRef: refId,
      amount: product.sell_price,
      customerName: userId ? "Member JunzTopp" : "Guest",
      customerEmail: guestContact?.includes("@") ? guestContact : undefined,
      customerPhone: !guestContact?.includes("@") ? guestContact : undefined,
      productName: product.name,
    });

    await supabaseAdmin
      .from("orders")
      .update({ payment_url: payment.paymentUrl, payment_trx_id: payment.trxId })
      .eq("ref_id", refId);

    return NextResponse.json({
      success: true,
      data: { refId, paymentUrl: payment.paymentUrl, qrString: payment.qrString, order },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
