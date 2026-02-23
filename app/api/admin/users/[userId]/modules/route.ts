// app/api/admin/users/[userId]/modules/route.ts
// Endpoint para atualizar módulos habilitados de um usuário - apenas para administradores
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthPayload,
  AuthError,
  AppError,
  ForbiddenError,
} from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
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
        { status: 404 },
      );
    }

    // Verificar se o usuário está ativo
    if (!adminUser.ativo) {
      return NextResponse.json(
        { success: false, error: "Conta desativada." },
        { status: 403 },
      );
    }

    // Verificar se é admin
    if (adminUser.tipo !== "ADMIN") {
      throw new ForbiddenError(
        "Acesso negado. Apenas administradores podem atualizar permissões.",
      );
    }

    const targetUserId = parseInt(params.userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: "ID de usuário inválido." },
        { status: 400 },
      );
    }

    const body = await request.json();
    // ✅ NOVO: Adicionado modulo_empresa à desestruturação
    const { modulo_importacao, modulo_livre, modulo_sala, modulo_empresa } =
      body;

    // Validar que pelo menos um campo foi enviado
    // ✅ NOVO: Adicionado modulo_empresa na validação
    if (
      modulo_importacao === undefined &&
      modulo_livre === undefined &&
      modulo_sala === undefined &&
      modulo_empresa === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum módulo foi especificado para atualização.",
        },
        { status: 400 },
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (modulo_importacao !== undefined)
      updateData.modulo_importacao = modulo_importacao;
    if (modulo_livre !== undefined) updateData.modulo_livre = modulo_livre;
    if (modulo_sala !== undefined) updateData.modulo_sala = modulo_sala;
    // ✅ NOVO: Adicionado modulo_empresa ao objeto de atualização
    if (modulo_empresa !== undefined)
      updateData.modulo_empresa = modulo_empresa;

    // Atualizar o usuário
    const updatedUser = await prisma.usuario.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        modulo_importacao: true,
        modulo_livre: true,
        modulo_sala: true,
        modulo_empresa: true, // ✅ NOVO: Adicionado ao select
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        moduloImportacao: updatedUser.modulo_importacao,
        moduloLivre: updatedUser.modulo_livre,
        moduloSala: updatedUser.modulo_sala,
        moduloEmpresa: updatedUser.modulo_empresa,
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/admin/users/[userId]/modules:", error);

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

    // Handle Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
