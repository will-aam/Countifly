// app/api/admin/users/route.ts
// Endpoint para listar todos os usuários (exceto admins) - apenas para administradores
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthPayload,
  AuthError,
  AppError,
  ForbiddenError,
} from "@/lib/auth";
export const dynamic = "force-dynamic"; // ✅ Adicione esta linha

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // Buscar o usuário atual para verificar se é admin
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

    // Verificar se o usuário está ativo
    if (!currentUser.ativo) {
      return NextResponse.json(
        { success: false, error: "Conta desativada." },
        { status: 403 },
      );
    }

    // Verificar se é admin
    if (currentUser.tipo !== "ADMIN") {
      throw new ForbiddenError(
        "Acesso negado. Apenas administradores podem acessar esta página.",
      );
    }

    // Listar todos os usuários (exceto admins)
    const users = await prisma.usuario.findMany({
      where: {
        tipo: "USUARIO",
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
        ativo: true,
        modulo_importacao: true,
        modulo_livre: true,
        modulo_sala: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        ativo: user.ativo,
        moduloImportacao: user.modulo_importacao,
        moduloLivre: user.modulo_livre,
        moduloSala: user.modulo_sala,
      })),
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
