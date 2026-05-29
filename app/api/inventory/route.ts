// app/api/inventory/route.ts
// Rota para lidar com operações de inventário (GET para obter produtos e DELETE para limpar dados)

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const toNum = (val: any) => {
  if (val === null || val === undefined) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const rateLimitResult = withRateLimit(request, "user", 100, 60000, userId);

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de leitura de inventário`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const GLOBAL_ADMIN_ID = 1;

    // 1. BUSCA O "SEU" MUNDO (Incluindo os itens IMPORTADOS)
    const myImportedBarcodes = await prisma.codigoBarras.findMany({
      where: { usuario_id: userId },
      include: { produto: true },
    });

    // 2. BUSCA O "CATÁLOGO" (Itens Fixos)
    const fixedCatalogProducts = await prisma.produto.findMany({
      where: {
        usuario_id: GLOBAL_ADMIN_ID,
        tipo_cadastro: "FIXO",
      },
    });

    // 3. --- LÓGICA DE PRIORIDADE (EVITAR DUPLICADOS) ---
    const importedProductCodes = new Set(
      myImportedBarcodes.map((b) => b.produto?.codigo_produto).filter(Boolean),
    );

    const uniqueCatalogProducts = fixedCatalogProducts.filter(
      (prod) => !importedProductCodes.has(prod.codigo_produto),
    );

    // 4. TRANSFORMANDO O CATÁLOGO FILTRADO EM FORMATO DE CÓDIGO DE BARRAS
    const catalogAsBarcodes = uniqueCatalogProducts.map((prod) => ({
      codigo_de_barras: prod.codigo_produto,
      produto_id: prod.id,
      usuario_id: GLOBAL_ADMIN_ID,
      created_at: prod.created_at,
      produto: prod,
    }));

    // 5. UNIFICANDO AS LISTAS
    const allBarCodes = [...myImportedBarcodes, ...catalogAsBarcodes];

    // 6. PREPARANDO A LISTA DE PRODUTOS
    const allProducts = allBarCodes
      .map((bc) => {
        if (!bc.produto) return null;

        return {
          ...bc.produto,
          saldo_estoque: toNum(bc.produto.saldo_estoque),
          preco: toNum(bc.produto.preco),
          categoria: bc.produto.categoria || "",
          subcategoria: bc.produto.subcategoria || "",
          marca: bc.produto.marca || "",
          tipo_cadastro: bc.produto.tipo_cadastro,
        };
      })
      .filter((p) => p !== null);

    return NextResponse.json({
      products: allProducts,
      barCodes: allBarCodes,
    });
  } catch (error) {
    console.error("[API ERROR]", error);
    return handleApiError(error);
  }
}

// --- DELETE (CORRIGIDO PARA SEPARAR CONTAGEM DE IMPORTAÇÃO) ---
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    let rateLimitResult;
    if (scope === "catalog") {
      rateLimitResult = withRateLimit(request, "user", 5, 3600000, userId);
    } else {
      rateLimitResult = withRateLimit(request, "user", 10, 3600000, userId);
    }

    if (rateLimitResult && !rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    const transactionOperations = [];

    // Filtros de Segurança (AGORA APAGA OS 'IMPORTADOS' E OS 'TEMPORARIOS')
    const filtroSegurancaProdutos = {
      usuario_id: userId,
      tipo_cadastro: { not: "FIXO" },
    };

    const filtroSegurancaBarras = {
      usuario_id: userId,
      produto: { tipo_cadastro: { not: "FIXO" } },
    };

    // 1. LIMPAR APENAS IMPORTAÇÃO (CATÁLOGO)
    if (scope === "catalog") {
      transactionOperations.push(
        prisma.codigoBarras.deleteMany({ where: filtroSegurancaBarras }),
        prisma.produto.deleteMany({ where: filtroSegurancaProdutos }),
      );
    }
    // 2. LIMPAR APENAS CONTAGEM (MOVIMENTOS)
    else if (scope === "counts") {
      const sessoesUsuario = await prisma.sessao.findMany({
        where: { anfitriao_id: userId },
        select: { id: true },
      });
      const idsSessoes = sessoesUsuario.map((s) => s.id);

      transactionOperations.push(
        prisma.movimento.deleteMany({
          where: { sessao_id: { in: idsSessoes } },
        }),
        prisma.itemContado.deleteMany({
          where: { contagem: { usuario_id: userId } },
        }),
        prisma.contagem.deleteMany({ where: { usuario_id: userId } }),
      );
    }
    // 3. LIMPAR TUDO (PADRÃO - "RESET GERAL")
    else {
      const sessoesUsuario = await prisma.sessao.findMany({
        where: { anfitriao_id: userId },
        select: { id: true },
      });
      const idsSessoes = sessoesUsuario.map((s) => s.id);

      transactionOperations.push(
        prisma.movimento.deleteMany({
          where: { sessao_id: { in: idsSessoes } },
        }),
        prisma.itemContado.deleteMany({
          where: { contagem: { usuario_id: userId } },
        }),
        prisma.contagem.deleteMany({ where: { usuario_id: userId } }),
        prisma.codigoBarras.deleteMany({ where: filtroSegurancaBarras }),
        prisma.produto.deleteMany({ where: filtroSegurancaProdutos }),
      );
    }

    await prisma.$transaction(transactionOperations);
    return NextResponse.json({ success: true, message: "Limpeza concluída." });
  } catch (error) {
    return handleApiError(error);
  }
}
