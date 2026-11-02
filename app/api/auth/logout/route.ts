// app/api/auth/logout/route.ts
/**
 * Rota de API para logout do usuário.
 * Responsabilidade:
 * 1. POST: Invalida o token de autenticação removendo o cookie com as mesmas opções de domínio/path.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  AuthError,
  getAuthCookieOptions,
  verifyAuthToken,
} from "@/lib/auth";

export async function POST() {
  const cookieOptions = getAuthCookieOptions();
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  let revocationFailed = false;

  if (token) {
    try {
      const payload = verifyAuthToken(token);
      await prisma.authSession.updateMany({
        where: {
          id: payload.jti,
          user_id: payload.userId,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    } catch (error) {
      // Tokens inválidos/expirados não podem autenticar e não precisam de revogação.
      if (!(error instanceof AuthError)) {
        revocationFailed = true;
        console.error("Falha ao revogar a sessão durante o logout:", error);
      }
    }
  }

  // Limpa o cookie respeitando domínio e path caso configurados
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  if (revocationFailed) {
    return NextResponse.json(
      { success: false, error: "Não foi possível revogar a sessão no servidor." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
