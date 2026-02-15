// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

interface TokenPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

interface UserData {
  tipo: string;
  ativo: boolean;
  modulo_importacao: boolean;
  modulo_livre: boolean;
  modulo_sala: boolean;
}

export async function middleware(request: NextRequest) {
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
    pathname.startsWith("/icons") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/serwist-")
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

  // 4) Decodificar JWT e buscar dados do usuário
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET não configurado");
      return NextResponse.next();
    }

    const payload = jwt.verify(authToken.value, jwtSecret, {
      algorithms: ["HS256"],
    }) as TokenPayload;

    const userId = payload.userId;

    // Buscar dados do usuário no banco usando Prisma singleton
    // NOTA: Para produção, considere usar cache (Redis) para melhorar performance
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        tipo: true,
        ativo: true,
        modulo_importacao: true,
        modulo_livre: true,
        modulo_sala: true,
      },
    });

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "user_not_found");
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se usuário está ativo
    if (!user.ativo) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "account_disabled");
      return NextResponse.redirect(loginUrl);
    }

    const isAdmin = user.tipo === "ADMIN";

    // Admin tem acesso total - bypass de verificações
    if (isAdmin) {
      return NextResponse.next();
    }

    // Verificar acesso a rotas administrativas
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Verificar acesso a módulos específicos
    if (pathname.startsWith("/count-import") && !user.modulo_importacao) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname.startsWith("/audit") && !user.modulo_livre) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname.startsWith("/team") && !user.modulo_sala) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Erro no middleware:", error);
    // Em caso de erro de verificação do token, permitir acesso
    // (as rotas de API farão suas próprias verificações)
    return NextResponse.next();
  }
}

// Aplica o middleware para todas as rotas, exceto assets estáticos de _next/image, etc.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
