"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
  }

  if (done) {
    return (
      <div style={{ maxWidth: 360, margin: "40px auto" }}>
        <h1 style={{ fontSize: 18 }}>Cek email kamu</h1>
        <p style={{ color: "var(--muted)" }}>
          Kami sudah kirim link konfirmasi ke {email}. Setelah dikonfirmasi, kamu bisa login.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1 style={{ fontSize: 18 }}>Daftar Akun</h1>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Daftar untuk dapat diskon & riwayat pesanan tersimpan otomatis. Opsional.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        <button disabled={loading}>{loading ? "Memproses..." : "Daftar"}</button>
      </form>
    </div>
  );
}
