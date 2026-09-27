"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setProducts(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const filtered = products.filter((p) =>
      `${p.category} ${p.name}`.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.reduce((acc, p) => {
      acc[p.category] = acc[p.category] || [];
      acc[p.category].push(p);
      return acc;
    }, {});
  }, [products, query]);

  return (
    <div>
      <section style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Topup Game Cepat & Murah</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Bayar QRIS / e-wallet, otomatis masuk dalam hitungan detik.
        </p>
        <input
          placeholder="Cari game, contoh: Mobile Legends"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      {loading && <p>Memuat produk...</p>}
      {!loading && products.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          Belum ada produk. Admin perlu sinkronisasi produk dari OkeConnect dulu lewat
          halaman <code>/admin</code>.
        </p>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16 }}>{category}</h2>
          <div className="grid">
            {items.map((p) => (
              <div
                key={p.code}
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/checkout?code=${p.code}`)}
              >
                <h3>{p.name}</h3>
                <div className="price">Rp {Number(p.sell_price).toLocaleString("id-ID")}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
