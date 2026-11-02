// app/api/auth/logout/route.ts
/**
 * Rota de API para logout do usuário.
 * Responsabilidade:
 * 1. POST: Invalida o token de autenticação removendo o cookie com as mesmas opções de domínio/path.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieOptions = getAuthCookieOptions();
  const cookieStore = cookies();

  // Limpa o cookie respeitando domínio e path caso configurados
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
