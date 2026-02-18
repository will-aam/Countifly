// app/api/user/preferred-mode/route.ts
/**
 * Rota de API para gerenciar o modo preferido do usuário autenticado.
 * Responsabilidade:
 * 1. PATCH: Atualizar o modo preferido do usuário.
 * 2. ✅ RATE LIMITING: 30 req/hora por usuário.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AppError, AuthError } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const ALLOWED_MODES = [
  "dashboard", // ver dashboard na home
  "count_import", // /count-import?tab=import
  "count_scan", // /count-import?tab=scan
  "audit", // /audit
  "team", // modo equipe (podemos refinar depois)
] as const;

type PreferredMode = (typeof ALLOWED_MODES)[number];

interface Body {
  preferredMode?: PreferredMode | null;
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // ✅ NOVO: RATE LIMITING (30 req/hora por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      30,
      3600000, // 1 hora
      userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de atualização de modo preferido`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const body = (await request.json()) as Body;

    const preferredMode = body.preferredMode ?? null;

    if (preferredMode !== null && !ALLOWED_MODES.includes(preferredMode)) {
      console.warn("[preferred-mode] Modo inválido recebido:", preferredMode);
      return NextResponse.json(
        { error: "Modo preferido inválido." },
        { status: 400 },
      );
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { preferred_mode: preferredMode },
      select: {
        id: true,
        preferred_mode: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferredMode: updated.preferred_mode,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar preferred_mode:", error);

    // Erro conhecido do Prisma: registro não encontrado
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Usuário não encontrado para atualizar preferência." },
        { status: 404 },
      );
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
