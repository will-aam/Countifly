// app/api/inventory/history/route.ts
// Rota de API para gerenciar o histórico de contagens salvas do usuário.
// Responsabilidades:
// 1. GET: Retornar a lista de contagens salvas do usuário, com suporte a paginação.
// 2. POST: Salvar uma nova contagem (recebendo o arquivo CSV e metadados via form-data).

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Identificar Usuário pelo Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Paginação
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // 3. Busca Otimizada (SEM o conteúdo CSV pesado na listagem)
    const [savedCounts, total] = await Promise.all([
      prisma.contagemSalva.findMany({
        where: { usuario_id: userId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          nome_arquivo: true,
          created_at: true,
          usuario_id: true,
          empresa_id: true, // ✅ NOVO: Incluir empresa_id na listagem
          // Ocultamos conteudo_csv para a listagem ser leve
        },
      }),
      prisma.contagemSalva.count({ where: { usuario_id: userId } }),
    ]);

    return NextResponse.json({
      data: savedCounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Identificar Usuário
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Receber Dados via FormData (Evita limite de JSON em arquivos grandes)
    const formData = await request.formData();
    const fileName = formData.get("fileName") as string;
    const csvContent = formData.get("csvContent") as string;
    const empresaIdStr = formData.get("empresa_id") as string | null; // ✅ NOVO

    if (!fileName || !csvContent) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // ✅ NOVO: Validar empresa (se fornecida)
    let empresaId: number | null = null;
    if (empresaIdStr) {
      empresaId = parseInt(empresaIdStr);

      // Verificar se a empresa pertence ao usuário e está ativa
      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { usuario_id: true, ativo: true },
      });

      if (!empresa || empresa.usuario_id !== userId || !empresa.ativo) {
        return NextResponse.json(
          { error: "Empresa inválida ou não pertence ao usuário." },
          { status: 400 },
        );
      }
    }

    // 3. Salvar no Banco (Tabela Legado de Histórico)
    const newSavedCount = await prisma.contagemSalva.create({
      data: {
        nome_arquivo: fileName, // Ex: "[IMP] Contagem Janeiro - Supermercado Central - 2026-02-16.csv"
        conteudo_csv: csvContent,
        usuario_id: userId,
        empresa_id: empresaId, // ✅ NOVO: Vincular empresa (se houver)
      },
    });

    return NextResponse.json(newSavedCount, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
