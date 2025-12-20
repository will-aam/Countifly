// app/api/inventory/[userId]/history/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
    }

    // 1. Segurança
    await validateAuth(request, userId);

    // 2. Paginação
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // 3. Busca Otimizada (SEM o conteúdo CSV pesado)
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
          // conteudo_csv: false // Garantindo que não vem o pesado
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
  } catch (error: any) {
    console.error("Erro na API History:", error);
    const errorMessage = error?.message || "Erro desconhecido";
    const status =
      errorMessage.includes("Acesso") || errorMessage.includes("Unauthorized")
        ? 403
        : 500;

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}

// POST permanece igual
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    await validateAuth(request, userId);

    const { fileName, csvContent } = await request.json();
    if (!fileName || !csvContent) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const newSavedCount = await prisma.contagemSalva.create({
      data: {
        nome_arquivo: fileName,
        conteudo_csv: csvContent,
        usuario_id: userId,
      },
    });

    return NextResponse.json(newSavedCount, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
