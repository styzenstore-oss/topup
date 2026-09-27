"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function StatusBadge({ status }) {
  const map = {
    success: ["success", "Berhasil"],
    processing: ["pending", "Diproses"],
    waiting_payment: ["pending", "Menunggu Bayar"],
    failed: ["failed", "Gagal"],
  };
  const [cls, label] = map[status] || ["pending", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function RiwayatPage() {
  const [orders, setOrders] = useState([]);
  const [contact, setContact] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setLoggedIn(true);
        const { data: rows } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        setOrders(rows || []);
      }
    });
  }, []);

  async function searchByContact(e) {
    e.preventDefault();
    setLoading(true);
    // Guest checkout: cari lewat API server (karena RLS membatasi akses langsung dari browser).
    const res = await fetch(`/api/order/search?contact=${encodeURIComponent(contact)}`);
    const data = await res.json();
    setOrders(data.data || []);
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: 18 }}>Riwayat Pembelian</h1>

      {!loggedIn && (
        <form onSubmit={searchByContact} style={{ maxWidth: 380, marginBottom: 20 }}>
          <div className="field">
            <label>Cek pesanan dengan kontak (WA/email) yang kamu pakai saat checkout</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} required />
          </div>
          <button disabled={loading}>{loading ? "Mencari..." : "Cari Pesanan"}</button>
        </form>
      )}

      {orders.length === 0 && <p style={{ color: "var(--muted)" }}>Belum ada riwayat pesanan.</p>}

      {orders.map((o) => (
        <div key={o.ref_id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>{o.product_name}</h3>
            <StatusBadge status={o.topup_status} />
          </div>
          <p style={{ color: "var(--muted)", margin: "4px 0" }}>Tujuan: {o.destination}</p>
          <p style={{ margin: "4px 0" }}>Rp {Number(o.price).toLocaleString("id-ID")}</p>
          {o.serial_number && <p style={{ color: "var(--accent2)" }}>SN: {o.serial_number}</p>}
          <p style={{ fontSize: 11, color: "var(--muted)" }}>{o.ref_id}</p>
        </div>
      ))}
    </div>
  );
}
