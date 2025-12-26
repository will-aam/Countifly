// app/api/auth/change-password/route.ts
/**
 * Rota de API para alteração de senha do usuário autenticado.
 * Responsabilidade:
 * 1. Validar a senha atual.
 * 2. Atualizar para a nova senha (após validação e hash).
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AuthError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Senha atual e nova senha são obrigatórias." },
        { status: 400 }
      );
    }

    // --- NOVO: validação de formato no backend ---
    const isCurrentValid = /^\d{6}$/.test(currentPassword);
    const isNewValid = /^\d{6}$/.test(newPassword);

    if (!isCurrentValid || !isNewValid) {
      return NextResponse.json(
        {
          error:
            "Formato de senha inválido. As senhas devem ter exatamente 6 números.",
        },
        { status: 400 }
      );
    }
    // ---------------------------------------------

    // 1) Ler o usuário autenticado a partir do JWT no cookie
    const tokenPayload = await getAuthPayload();
    const userId = tokenPayload.userId;

    // 2) Buscar usuário no banco
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user || !user.senha_hash) {
      return NextResponse.json(
        { error: "Usuário não encontrado ou senha não configurada." },
        { status: 404 }
      );
    }

    // 3) Conferir senha atual
    const isValid = await bcrypt.compare(currentPassword, user.senha_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Senha atual incorreta." },
        { status: 400 }
      );
    }

    // 4) Criptografar nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 5) Atualizar no banco
    await prisma.usuario.update({
      where: { id: userId },
      data: { senha_hash: newPasswordHash },
    });

    return NextResponse.json(
      { message: "Senha alterada com sucesso." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro em /api/auth/change-password:", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Não autenticado ou sessão expirada." },
        { status: error.statusCode ?? 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno ao tentar alterar a senha." },
      { status: 500 }
    );
  }
}
