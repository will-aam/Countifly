// app/api/inventory/[userId]/history/[historyId]/route.ts
/**
 * Rota de API para gerenciar um item específico do histórico.
 * Lida com a exclusão (DELETE) de uma contagem salva.
 *
 * ROTA PROTEGIDA: Esta rota valida o Token JWT antes de executar.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api"; // Importamos o Handler Central

/**
 * Exclui um item específico do histórico de um usuário.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; historyId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    const historyId = parseInt(params.historyId, 10);

    if (isNaN(userId) || isNaN(historyId)) {
      return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
    }

    // 1. Segurança (Lança AuthError ou ForbiddenError se falhar)
    await validateAuth(request, userId);

    // 2. Exclusão Segura (Garante propriedade com deleteMany)
    // deleteMany retorna { count: n }, útil para saber se algo foi deletado sem lançar erro se não existir.
    const result = await prisma.contagemSalva.deleteMany({
      where: {
        id: historyId,
        usuario_id: userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error:
            "Item não encontrado ou você não tem permissão para excluí-lo.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Item do histórico excluído com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    // Tratamento Centralizado
    return handleApiError(error);
  }
}
