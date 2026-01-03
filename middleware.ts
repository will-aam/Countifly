import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Rotas públicas (não exigem autenticação via JWT)
  // - /login: tela de autenticação
  // - /api/auth: login (POST) com JWT
  // - /participant e /api/session: fluxo de colaborador (multiplayer)
  const publicPaths = ["/login", "/api/auth", "/participant", "/api/session"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // 2) Ignorar arquivos estáticos e assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/icons") // se você tiver ícones PWA
  ) {
    return NextResponse.next();
  }

  // 3) Verificar cookie de autenticação JWT
  const authToken = request.cookies.get("authToken");

  if (!authToken) {
    const loginUrl = new URL("/login", request.url);
    // Preserva a rota original para redirecionar após login
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4) Se tem authToken, deixa seguir normalmente
  return NextResponse.next();
}

// Aplica o middleware para todas as rotas, exceto assets estáticos de _next/image, etc.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
