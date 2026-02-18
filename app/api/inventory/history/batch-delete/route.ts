// app/api/inventory/history/batch-delete/route.ts
// Rota de API para excluir em lote contagens salvas do usuário.
// Responsabilidades:
// 1. Validar a lista de IDs recebida no corpo da requisição.
// 2. Excluir apenas os registros que pertencem ao usuário autenticado.
// 3. Retornar o número de registros excluídos ou mensagens de erro apropriadas.
// 4. ✅ RATE LIMITING: 20 req/hora por usuário.

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // ✅ NOVO: RATE LIMITING (20 req/hora por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      20,
      3600000, // 1 hora
      userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de exclusão em lote`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Lista de IDs inválida." },
        { status: 400 },
      );
    }

    // Validação: todos os IDs devem ser números
    const validIds = ids.filter((id) => typeof id === "number");
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "Nenhum ID válido fornecido." },
        { status: 400 },
      );
    }

    // Excluir apenas os registros que pertencem ao usuário autenticado
    const result = await prisma.contagemSalva.deleteMany({
      where: {
        id: { in: validIds },
        usuario_id: userId,
      },
    });

    return NextResponse.json(
      {
        count: result.count,
        message: `${result.count} ${result.count === 1 ? "item excluído" : "itens excluídos"} com sucesso.`,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
