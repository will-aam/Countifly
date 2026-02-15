// app/api/admin/users/[userId]/status/route.ts
// Endpoint para ativar/desativar um usuário - apenas para administradores
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AuthError, AppError, ForbiddenError } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const payload = await getAuthPayload();
    const adminUserId = payload.userId;

    // Buscar o usuário admin
    const adminUser = await prisma.usuario.findUnique({
      where: { id: adminUserId },
      select: { tipo: true, ativo: true },
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Verificar se o usuário está ativo
    if (!adminUser.ativo) {
      return NextResponse.json(
        { success: false, error: "Conta desativada." },
        { status: 403 }
      );
    }

    // Verificar se é admin
    if (adminUser.tipo !== "ADMIN") {
      throw new ForbiddenError("Acesso negado. Apenas administradores podem atualizar status de usuários.");
    }

    const targetUserId = parseInt(params.userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { ativo } = body;

    // Validar que o campo ativo foi enviado
    if (ativo === undefined || typeof ativo !== "boolean") {
      return NextResponse.json(
        { success: false, error: "O campo 'ativo' é obrigatório e deve ser um booleano." },
        { status: 400 }
      );
    }

    // Atualizar o status do usuário
    const updatedUser = await prisma.usuario.update({
      where: { id: targetUserId },
      data: { ativo },
      select: {
        id: true,
        email: true,
        ativo: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        ativo: updatedUser.ativo,
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/admin/users/[userId]/status:", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode ?? 401 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    // Handle Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
