// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Rotas públicas (não exigem autenticação via JWT)
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
    pathname.startsWith("/icons")
  ) {
    return NextResponse.next();
  }

  // 3) Verificar cookie de autenticação JWT
  const authToken = request.cookies.get("authToken");

  if (!authToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4) Se tem authToken, deixa seguir
  // NOTA: Verificação de módulos e tipo de usuário será feita:
  // - No frontend (useUserModules hook)
  // - Nas API routes (getAuthPayload + verificação de tipo)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
