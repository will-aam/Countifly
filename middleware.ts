// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, CSRFError } from "@/lib/csrf";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Proteção CSRF: validação de Origin/Referer em métodos mutativos para rotas /api/*
  if (pathname.startsWith("/api/")) {
    try {
      validateOrigin(request);
    } catch (error) {
      if (error instanceof CSRFError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      return NextResponse.json(
        { error: "Falha na validação de segurança da requisição." },
        { status: 403 }
      );
    }
  }

  // 2) Rotas públicas (não exigem autenticação via JWT)
  const publicPaths = ["/login", "/api/auth", "/participant", "/api/session", "/terms", "/privacy"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // 3) Ignorar arquivos estáticos e assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/icons")
  ) {
    return NextResponse.next();
  }

  // 4) Verificar cookie de autenticação JWT
  const authToken = request.cookies.get("authToken");

  if (!authToken) {
    // Para rotas de API protegidas sem cookie, retorna 401 JSON diretamente
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sessão expirada ou não autenticada." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5) Se tem authToken, deixa seguir
  // NOTA: Verificação de módulos e tipo de usuário será feita:
  // - No frontend (useUserModules hook)
  // - Nas API routes (getAuthPayload + verificação de tipo)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
