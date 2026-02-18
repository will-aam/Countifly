// app/api/inventory/item/route.ts
// Rota API para deletar um item do inventário baseado no código de barras e sessão
// Responsabilidades:
// 1. DELETE: Remover movimentos de um item específico.
// 2. ✅ RATE LIMITING: 50 req/hora por usuário.

import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // ✅ NOVO: RATE LIMITING (50 req/hora por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      50,
      3600000, // 1 hora
      userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de exclusão de itens`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");
    // Permite passar o sessionId explicitamente para maior segurança
    const sessionIdParam = searchParams.get("sessionId");

    if (!barcode) {
      return NextResponse.json(
        { error: "Código de barras obrigatório" },
        { status: 400 },
      );
    }

    let whereClause: any = {
      codigo_barras: barcode,
    };

    if (sessionIdParam) {
      // Se tiver ID da sessão, deleta especificamente nela (Seguro para Multiplayer)
      whereClause.sessao_id = parseInt(sessionIdParam);

      // Validação extra: garantir que o usuário tem acesso a essa sessão
      const sessao = await prisma.sessao.findFirst({
        where: {
          id: parseInt(sessionIdParam),
          OR: [
            { anfitriao_id: userId },
            { participantes: { some: { usuario_id: userId } } },
          ],
        },
      });

      if (!sessao) {
        return NextResponse.json(
          { error: "Sessão não encontrada ou sem permissão." },
          { status: 403 },
        );
      }
    } else {
      // Comportamento Padrão (Single Player Focado):
      // Busca a sessão ativa do usuário para não deletar de todas as sessões abertas "sem querer"
      // Se não passar ID, assumimos que é para limpar da sessão INDIVIDUAL ou da ÚNICA aberta.

      whereClause.sessao = {
        anfitriao_id: userId,
        status: "ABERTA",
      };
    }

    // Deleta todos os movimentos baseados no filtro construído
    await prisma.movimento.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    return NextResponse.json(
      { error: "Erro interno ao deletar item" },
      { status: 500 },
    );
  }
}
