// app/api/inventory/history/route.ts
/**
 * Rota de API para gerenciar o histórico de contagens salvas do usuário.
 * Responsabilidades:
 * 1. GET: Listar contagens salvas com paginação.
 * 2. POST: Salvar uma nova contagem (arquivo CSV rico com valuation).
 */
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

    // Opcional: clientName (Ainda não temos coluna no banco para isso, mas o frontend envia)
    // Futuramente podemos adicionar uma coluna 'cliente' na tabela ContagemSalva
    // const clientName = formData.get("clientName") as string;

    if (!fileName || !csvContent) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // 3. Salvar no Banco (Tabela Legado de Histórico)
    // Mesmo sendo a nova auditoria, usamos a estrutura existente para compatibilidade
    const newSavedCount = await prisma.contagemSalva.create({
      data: {
        nome_arquivo: fileName, // Ex: "Auditoria Janeiro - Cliente X - 2026-01-01.csv"
        conteudo_csv: csvContent,
        usuario_id: userId,
      },
    });

    return NextResponse.json(newSavedCount, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
