// app/api/inventory/[userId]/history/route.ts
/**
 * Rota de API para gerenciar o histórico de contagens salvas do usuário.
 * Responsabilidades:
 * 1. GET: Listar contagens salvas com paginação.
 * 2. POST: Salvar uma nova contagem (arquivo CSV).
 */
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

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    await validateAuth(request, userId);

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
  } catch (error: any) {
    console.error("Erro ao salvar histórico:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
