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
      return NextResponse.json(
        { error: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    await validateAuth(request, userId);

    // --- NOVA LÓGICA DE PAGINAÇÃO ---
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10"); // Padrão: 10 itens por página
    const skip = (page - 1) * limit;

    // Buscamos os dados e o total de registros em paralelo para performance
    const [savedCounts, total] = await Promise.all([
      prisma.contagemSalva.findMany({
        where: { usuario_id: userId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.contagemSalva.count({ where: { usuario_id: userId } }),
    ]);

    // Retornamos um objeto com dados e metadados
    return NextResponse.json({
      data: savedCounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
    // -------------------------------
  } catch (error: any) {
    const status =
      error.message.includes("Acesso não autorizado") ||
      error.message.includes("Acesso negado")
        ? error.message.includes("negado")
          ? 403
          : 401
        : 500;

    console.error("Erro ao buscar histórico:", error.message);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: status }
    );
  }
}

// ... O método POST permanece igual ...
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // (Mantenha o código original do POST aqui)
  // ...
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    await validateAuth(request, userId);

    const { fileName, csvContent } = await request.json();
    if (!fileName || !csvContent) {
      return NextResponse.json(
        { error: "Nome do arquivo e conteúdo são obrigatórios." },
        { status: 400 }
      );
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
    const status =
      error.message.includes("Acesso não autorizado") ||
      error.message.includes("Acesso negado")
        ? error.message.includes("negado")
          ? 403
          : 401
        : 500;

    console.error("Erro ao salvar contagem:", error.message);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: status }
    );
  }
}
