// app/api/user/display-name/route.ts
/**
 * Rota de API para gerenciar o nome de exibição do usuário autenticado.
 * Responsabilidade:
 * 1. PATCH: Atualizar o nome de exibição do usuário.
 * 2. ✅ RATE LIMITING: 20 req/hora por usuário.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AuthError, AppError } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(request: NextRequest) {
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
        `[RATE LIMIT] Usuário ${userId} excedeu limite de atualização de nome`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const body = (await request.json()) as { displayName?: string | null };

    // Normaliza: trim e limita tamanho
    let displayName = (body.displayName ?? "").trim();
    if (displayName.length === 0) {
      displayName = "";
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
