// app/api/inventory/[userId]/history/route.ts
/**
 * Rota de API para gerenciar a coleção de histórico de um usuário.
 * Lida com a listagem (GET) e a criação (POST) de contagens salvas.
 *
 * ROTA PROTEGIDA: Esta rota valida o Token JWT antes de executar.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api"; // Importamos o Handler Central

// --- HISTÓRICO: GET (Listar Contagens) ---
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

    // 1. Segurança
    await validateAuth(request, userId);

    // 2. Buscar histórico
    const savedCounts = await prisma.contagemSalva.findMany({
      where: { usuario_id: userId },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(savedCounts);
  } catch (error) {
    return handleApiError(error);
  }
}

// --- HISTÓRICO: POST (Salvar Contagem) ---
export async function POST(
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

    // 1. Segurança
    await validateAuth(request, userId);

    // 2. Validar Payload
    const { fileName, csvContent } = await request.json();
    if (!fileName || !csvContent) {
      return NextResponse.json(
        { error: "Nome do arquivo e conteúdo são obrigatórios." },
        { status: 400 }
      );
    }

    // 3. Salvar
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
