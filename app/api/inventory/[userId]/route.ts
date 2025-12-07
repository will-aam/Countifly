// app/api/inventory/[userId]/route.ts
/**
 * Rota de API para gerenciar o inventário de um usuário específico.
 * Fornece endpoints para buscar o catálogo (GET) e limpar dados (DELETE).
 *
 * ROTA PROTEGIDA: Esta rota valida o Token JWT antes de executar.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api"; // Importamos o Handler Central

// Helper para converter Decimal do Prisma em Number do JS
// Isso evita erros de serialização JSON e cálculos no frontend
const toNum = (val: any) => {
  if (!val) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

// --- SESSÃO: GET (Buscar Catálogo) ---
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

    // 1. Segurança (Lança AuthError ou ForbiddenError se falhar)
    await validateAuth(request, userId);

    // 2. Buscar dados
    const userBarCodes = await prisma.codigoBarras.findMany({
      where: { usuario_id: userId },
      include: { produto: true },
    });

    // 3. Mapear e Converter Decimais
    const userProducts = userBarCodes
      .map((bc) => {
        if (!bc.produto) return null;
        return {
          ...bc.produto,
          // Converter Decimal -> Number para não quebrar o JSON
          saldo_estoque: toNum(bc.produto.saldo_estoque),
        };
      })
      .filter((p) => p !== null);

    return NextResponse.json({
      products: userProducts,
      barCodes: userBarCodes,
    });
  } catch (error) {
    // Tratamento Centralizado: resolve Auth, Forbidden e Erros Internos
    return handleApiError(error);
  }
}

// --- SESSÃO: DELETE (Limpar Dados) ---
export async function DELETE(
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

    // 2. Transação (Atomicidade)
    await prisma.$transaction([
      prisma.itemContado.deleteMany({
        where: { contagem: { usuario_id: userId } },
      }),
      prisma.contagem.deleteMany({
        where: { usuario_id: userId },
      }),
      prisma.codigoBarras.deleteMany({
        where: { usuario_id: userId },
      }),
      prisma.produto.deleteMany({
        where: { usuario_id: userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Dados do inventário excluídos com sucesso.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
