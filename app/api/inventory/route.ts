// app/api/inventory/route.ts
/**
 * Rota de API para gerenciar o inventário do USUÁRIO LOGADO.
 * (Substitui a antiga rota dinâmica [userId])
 * * Responsabilidade:
 * 1. GET: Buscar o catálogo do usuário autenticado.
 * 2. DELETE: Limpar dados do usuário autenticado.
 * * SEGURANÇA: O ID é extraído diretamente do Token JWT via getAuthPayload().
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

// Garante que a rota não faça cache estático, pois depende do usuário logado
export const dynamic = "force-dynamic";

// Helper para converter Decimal do Prisma em Number do JS
const toNum = (val: any) => {
  if (!val) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

// --- GET (Buscar Catálogo) ---
export async function GET(request: NextRequest) {
  try {
    // 1. Extrair ID do Token (Segurança Máxima + Resolução de Rota)
    // Se não tiver token, o getAuthPayload lança erro automaticamente
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Buscar dados usando o ID do token
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
    return handleApiError(error);
  }
}

// --- DELETE (Limpar Dados) ---
export async function DELETE(request: NextRequest) {
  try {
    // 1. Extrair ID do Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Transação (Usando o ID do token)
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
      // Nota: Não limpamos as Sessões aqui para evitar inconsistência no modo multiplayer,
      // mas limpamos os dados legados.
    ]);

    return NextResponse.json({
      success: true,
      message: "Dados do inventário excluídos com sucesso.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
