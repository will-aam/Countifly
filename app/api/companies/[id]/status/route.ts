// app/api/companies/[id]/status/route.ts
/**
 * Rota para alterar status de ativação de empresa.
 * Responsabilidades:
 * 1. PATCH: Ativar/desativar empresa.
 * 2. ✅ RATE LIMITING: 50 req/hora por usuário.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await getAuthPayload();
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    // ✅ NOVO: RATE LIMITING (50 req/hora por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      50,
      3600000, // 1 hora
      payload.userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${payload.userId} excedeu limite de alteração de status de empresas`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const companyId = parseInt(params.id);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 },
      );
    }

    // Verificar propriedade
    const existing = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { usuario_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Empresa não encontrada" },
        { status: 404 },
      );
    }

    if (existing.usuario_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { ativo } = body;

    if (typeof ativo !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Status inválido" },
        { status: 400 },
      );
    }

    const updated = await prisma.empresa.update({
      where: { id: companyId },
      data: { ativo },
      select: { id: true, ativo: true },
    });

    return NextResponse.json({
      success: true,
      company: updated,
    });
  } catch (error) {
    console.error("Erro ao alterar status da empresa:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
