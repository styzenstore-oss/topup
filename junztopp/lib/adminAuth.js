import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "jzt_admin_session";

function expectedToken() {
  // Token = HMAC dari password admin, jadi tidak menyimpan password mentah
  // di cookie, dan cookie tidak berguna kalau ADMIN_PASSWORD di server diganti.
  return crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD || "")
    .update("junztopp-admin")
    .digest("hex");
}

export function isValidAdminPassword(password) {
  return Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}

export function adminSessionCookie() {
  return { name: COOKIE_NAME, value: expectedToken() };
}

/** Dipakai di server component / route handler untuk cek sesi admin. */
export function isAdminAuthed() {
  const store = cookies();
  const cookie = store.get(COOKIE_NAME);
  return Boolean(cookie && cookie.value === expectedToken());
}
