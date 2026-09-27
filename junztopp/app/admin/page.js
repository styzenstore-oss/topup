"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  async function loadOrders() {
    const res = await fetch("/api/admin/orders");
    if (res.status === 401) return router.push("/admin/login");
    const data = await res.json();
    setOrders(data.data || []);
  }

  async function loadProducts() {
    const res = await fetch("/api/admin/products");
    if (res.status === 401) return router.push("/admin/login");
    const data = await res.json();
    setProducts(data.data || []);
  }

  useEffect(() => {
    (async () => {
      await loadOrders();
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (tab === "products" && authChecked) loadProducts();
  }, [tab, authChecked]);

  async function syncProducts() {
    setSyncing(true);
    setSyncStatus("");
    try {
      const res = await fetch("/api/products", { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSyncStatus(`Berhasil sinkron ${data.synced} produk dari OkeConnect.`);
      if (tab === "products") loadProducts();
    } catch (err) {
      setSyncStatus(`Gagal: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function updateProduct(code, patch) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...patch }),
    });
    loadProducts();
  }

  async function markOrder(refId, topup_status) {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refId, topup_status }),
    });
    loadOrders();
  }

  const paidCount = orders.filter((o) => o.payment_status === "paid").length;
  const successCount = orders.filter((o) => o.topup_status === "success").length;
  const pendingCount = orders.filter((o) => o.topup_status === "processing" || o.topup_status === "waiting_payment").length;
  const revenueToday = orders
    .filter((o) => o.payment_status === "paid" && o.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((sum, o) => sum + Number(o.price), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Admin Dashboard</h1>
        <button
          style={{ width: "auto", padding: "8px 14px" }}
          onClick={syncProducts}
          disabled={syncing}
        >
          {syncing ? "Menyinkron..." : "Sinkron Produk OkeConnect"}
        </button>
      </div>
      {syncStatus && <p style={{ fontSize: 13 }}>{syncStatus}</p>}

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <StatCard label="Order dibayar" value={paidCount} />
        <StatCard label="Topup sukses" value={successCount} />
        <StatCard label="Diproses/menunggu" value={pendingCount} />
        <StatCard label="Omzet hari ini" value={`Rp ${revenueToday.toLocaleString("id-ID")}`} />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, borderBottom: "1px solid #1e2740" }}>
        {["orders", "products"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              width: "auto",
              background: "none",
              color: tab === t ? "var(--accent2)" : "var(--muted)",
              fontWeight: tab === t ? 700 : 400,
              borderRadius: 0,
              borderBottom: tab === t ? "2px solid var(--accent2)" : "2px solid transparent",
              padding: "6px 4px",
            }}
          >
            {t === "orders" ? "Pesanan" : "Produk"}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div>
          {orders.map((o) => (
            <div key={o.ref_id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{o.product_name}</strong>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {o.ref_id} · Tujuan: {o.destination}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Rp {Number(o.price).toLocaleString("id-ID")}</div>
                  <div style={{ fontSize: 12 }}>
                    Bayar: {o.payment_status} · Topup: {o.topup_status}
                  </div>
                </div>
              </div>
              {o.topup_status !== "success" && o.payment_status === "paid" && (
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button style={{ width: "auto", fontSize: 12, padding: "6px 10px" }} onClick={() => markOrder(o.ref_id, "success")}>
                    Tandai Sukses (Manual)
                  </button>
                  <button style={{ width: "auto", fontSize: 12, padding: "6px 10px", background: "#3b1212", color: "#f87171" }} onClick={() => markOrder(o.ref_id, "failed")}>
                    Tandai Gagal
                  </button>
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && <p style={{ color: "var(--muted)" }}>Belum ada pesanan.</p>}
        </div>
      )}

      {tab === "products" && (
        <div>
          {products.map((p) => (
            <div key={p.code} className="card" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {p.code} · Modal: Rp {Number(p.price).toLocaleString("id-ID")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  style={{ width: 110 }}
                  defaultValue={p.sell_price}
                  onBlur={(e) => updateProduct(p.code, { sell_price: Number(e.target.value) })}
                />
                <button
                  style={{
                    width: "auto",
                    fontSize: 12,
                    padding: "6px 10px",
                    background: p.is_active ? "#123b23" : "#3b1212",
                    color: p.is_active ? "#4ade80" : "#f87171",
                  }}
                  onClick={() => updateProduct(p.code, { is_active: !p.is_active })}
                >
                  {p.is_active ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              Belum ada produk tersinkron. Klik "Sinkron Produk OkeConnect" di atas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
