// app/api/admin/users/route.ts
// Endpoint para listar usuários paginados - apenas para administradores
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthPayload,
  AuthError,
  AppError,
  ForbiddenError,
} from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const rateLimitResult = withRateLimit(
      request,
      "user",
      100,
      3600000, // 1 hora
      userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Admin ${userId} excedeu limite de consulta de usuários`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const currentUser = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { tipo: true, ativo: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    if (!currentUser.ativo) {
      return NextResponse.json(
        { success: false, error: "Conta desativada." },
        { status: 403 },
      );
    }

    if (currentUser.tipo !== "ADMIN") {
      throw new ForbiddenError(
        "Acesso negado. Apenas administradores podem acessar esta página.",
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );
    const skip = (page - 1) * limit;
    const query = searchParams.get("q")?.trim();
    const status = searchParams.get("status") || "all";

    const where: any = {
      id: { not: Number(userId) },
    };

    if (status === "active") {
      where.ativo = true;
    } else if (status === "inactive") {
      where.ativo = false;
    }

    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { display_name: { contains: query, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
          ativo: true,
          modulo_importacao: true,
          modulo_livre: true,
          modulo_sala: true,
          modulo_empresa: true,
          modulo_modular: true,
          modulo_api: true,
        },
      }),
      prisma.usuario.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at.toISOString(),
        ativo: user.ativo,
        moduloImportacao: user.modulo_importacao,
        moduloLivre: user.modulo_livre,
        moduloSala: user.modulo_sala,
        moduloEmpresa: user.modulo_empresa,
        moduloModular: user.modulo_modular,
        moduloApi: user.modulo_api,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/admin/users:", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode ?? 401 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
