// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // TODO: troque isso pela checagem real no seu banco
  const isValidUser = email === "admin@" && password === "120814";

  if (!isValidUser) {
    return NextResponse.json(
      { success: false, message: "Credenciais inválidas" },
      { status: 401 }
    );
  }

  // Em produção, aqui você geraria um JWT ou ID de sessão real
  const fakeToken = "fake-session-token";

  const res = NextResponse.json({ success: true });

  res.cookies.set("countifly_session", fakeToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  return res;
}
