"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Password salah");
      return;
    }
    router.push("/admin");
  }

  return (
    <div style={{ maxWidth: 320, margin: "60px auto" }}>
      <h1 style={{ fontSize: 18 }}>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Password Admin</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        <button disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
      </form>
    </div>
  );
}
