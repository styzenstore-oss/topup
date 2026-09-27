import { NextResponse } from "next/server";
import { isValidAdminPassword, adminSessionCookie } from "../../../../lib/adminAuth";

export async function POST(req) {
  const { password } = await req.json();

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ success: false, message: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  const { name, value } = adminSessionCookie();
  res.cookies.set(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 jam
  });
  return res;
}
