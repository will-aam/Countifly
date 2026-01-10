// app/api/user/display-name/route.ts
/**
 * Rota de API para gerenciar o nome de exibição do usuário autenticado.
 * Responsabilidade:
 * 1. PATCH: Atualizar o nome de exibição do usuário.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AuthError, AppError } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const payload = await getAuthPayload(); // usa o authToken do cookie
    const userId = payload.userId;

    const body = (await request.json()) as { displayName?: string | null };

    // Normaliza: trim e limita tamanho
    let displayName = (body.displayName ?? "").trim();
    if (displayName.length === 0) {
      displayName = ""; // vamos salvar como string vazia ou null, se preferir
    }
    if (displayName.length > 100) {
      displayName = displayName.slice(0, 100);
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        display_name: displayName.length > 0 ? displayName : null,
      },
      select: {
        id: true,
        display_name: true,
      },
    });

    return NextResponse.json({
      success: true,
      displayName: updated.display_name,
    });
  } catch (error: any) {
    console.error("Erro em /api/user/display-name:", error);

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

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
