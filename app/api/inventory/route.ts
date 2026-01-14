// app/api/inventory/route.ts
/**
 * Rota de API para gerenciar o inventário do USUÁRIO LOGADO.
 * Responsabilidade:
 * 1. GET: Buscar o catálogo (Agora incluindo Preço e Categoria).
 * 2. DELETE: Limpar dados (Com suporte a escopo: 'all' ou 'catalog').
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Helper para converter Decimal do Prisma para Number do JS
const toNum = (val: any) => {
  if (val === null || val === undefined) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

// --- GET (Buscar Catálogo) ---
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // Busca todos os códigos de barras vinculados ao produto
    const userBarCodes = await prisma.codigoBarras.findMany({
      where: { usuario_id: userId },
      include: { produto: true },
    });

    // Mapeia para o formato que o frontend espera (Product interface)
    const userProducts = userBarCodes
      .map((bc) => {
        if (!bc.produto) return null;

        return {
          ...bc.produto,
          // Conversão de tipos críticos
          saldo_estoque: toNum(bc.produto.saldo_estoque),

          // --- NOVOS CAMPOS PARA AUDITORIA/VALUATION ---
          preco: toNum(bc.produto.preco), // Decimal -> Number (0.00 se nulo)
          categoria: bc.produto.categoria || "", // String (Vazio se nulo)
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

// --- DELETE (Limpar Dados com Escopo) ---
export async function DELETE(request: NextRequest) {
  try {
    // 1. Identifica o usuário
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Verifica o escopo da limpeza na URL (ex: ?scope=catalog)
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope"); // 'catalog' | 'all' (padrão é all se não passar nada)

    // Ações baseadas no escopo
    const transactionOperations = [];

    if (scope === "catalog") {
      // --- ESCOPO: APENAS IMPORTAÇÃO ---
      // Limpa apenas tabelas de cadastro de produtos
      console.log(`[DELETE] Limpando apenas catálogo do usuário ${userId}`);

      transactionOperations.push(
        prisma.codigoBarras.deleteMany({
          where: { usuario_id: userId },
        }),
        prisma.produto.deleteMany({
          where: { usuario_id: userId },
        })
      );
    } else {
      // --- ESCOPO: TUDO (Padrão / Borracha Geral) ---
      console.log(`[DELETE] Limpando TUDO do usuário ${userId}`);

      // 1. Descobre sessões para limpar movimentos
      const sessoesUsuario = await prisma.sessao.findMany({
        where: { anfitriao_id: userId },
        select: { id: true },
      });
      const idsSessoes = sessoesUsuario.map((s) => s.id);

      transactionOperations.push(
        // Limpa Movimentos
        prisma.movimento.deleteMany({
          where: { sessao_id: { in: idsSessoes } },
        }),
        // Limpa Tabelas Legadas
        prisma.itemContado.deleteMany({
          where: { contagem: { usuario_id: userId } },
        }),
        prisma.contagem.deleteMany({
          where: { usuario_id: userId },
        }),
        // Limpa Catálogo também
        prisma.codigoBarras.deleteMany({
          where: { usuario_id: userId },
        }),
        prisma.produto.deleteMany({
          where: { usuario_id: userId },
        })
      );
    }

    // 3. Executa a transação
    await prisma.$transaction(transactionOperations);

    return NextResponse.json({
      success: true,
      message:
        scope === "catalog"
          ? "Importação limpa com sucesso. Contagens mantidas."
          : "Todos os dados foram excluídos com sucesso.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
