"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/");
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1 style={{ fontSize: 18 }}>Masuk</h1>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Login bersifat opsional — kamu tetap bisa checkout tanpa akun.
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        <button disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
      </form>
      <p style={{ fontSize: 13, marginTop: 12 }}>
        Belum punya akun? <a href="/register" style={{ color: "var(--accent2)" }}>Daftar</a>
      </p>
    </div>
  );
}
