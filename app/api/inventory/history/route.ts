// app/api/inventory/history/route.ts
/**
 * Rota de API para gerenciar o histórico de contagens salvas do usuário.
 * Responsabilidades:
 * 1. GET: Listar contagens salvas com paginação.
 * 2. POST: Salvar uma nova contagem (arquivo CSV).
 */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth"; // Mudança aqui: Import do Auth
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Identificar Usuário pelo Token (Sem params)
    const payload = await getAuthPayload();
    const userId = payload.userId;

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
          // O conteúdo CSV não é retornado na listagem para economizar banda
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
    // 1. Identificar Usuário pelo Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // MUDANÇA PRINCIPAL: Usamos formData() em vez de json()
    // Isso evita o erro de limite de payload (413) em arquivos grandes
    const formData = await request.formData();
    const fileName = formData.get("fileName") as string;
    const csvContent = formData.get("csvContent") as string;

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
  } catch (error) {
    return handleApiError(error);
  }
}
