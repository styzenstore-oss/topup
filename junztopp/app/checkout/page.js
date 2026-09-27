"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function CheckoutForm() {
  const params = useSearchParams();
  const code = params.get("code");

  const [product, setProduct] = useState(null);
  const [destination, setDestination] = useState("");
  const [contact, setContact] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null));
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((res) => {
        const found = res.data?.find((p) => p.code === code);
        setProduct(found || null);
      });
  }, [code]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: code,
          destination,
          userId,
          guestContact: userId ? undefined : contact,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      window.location.href = data.data.paymentUrl;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!product) return <p>Memuat produk...</p>;

  return (
    <div style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: 18 }}>{product.name}</h1>
      <p className="price" style={{ fontSize: 22 }}>
        Rp {Number(product.sell_price).toLocaleString("id-ID")}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>ID Game / Nomor Tujuan</label>
          <input
            required
            placeholder="Contoh: 123456789(1234) atau 08123456789"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        {!userId && (
          <div className="field">
            <label>Kontak kamu (WA / email) — untuk cek status pesanan</label>
            <input
              required
              placeholder="0812xxxx atau email@contoh.com"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        )}

        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        <button disabled={loading} type="submit">
          {loading ? "Memproses..." : "Bayar Sekarang"}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p>Memuat...</p>}>
      <CheckoutForm />
    </Suspense>
  );
}
