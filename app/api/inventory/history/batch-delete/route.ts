// app/api/inventory/history/batch-delete/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Lista de IDs inválida." },
        { status: 400 }
      );
    }

    // Validação: todos os IDs devem ser números
    const validIds = ids.filter((id) => typeof id === "number");
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "Nenhum ID válido fornecido." },
        { status: 400 }
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
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
