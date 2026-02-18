// app/api/inventory/route.ts
// Rota para lidar com operações de inventário (GET para obter produtos e DELETE para limpar dados)
// Responsabilidades:
// 1. GET: Retornar a lista unificada de produtos (importados + catálogo fixo) para o usuário.
// 2. DELETE: Limpar dados do usuário, com escopo definido (apenas importação, apenas contagem, ou tudo).
// 3. ✅ RATE LIMITING: 100 req/min (GET), 5 req/hora (DELETE catalog), 10 req/hora (DELETE counts/all).

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

    // ✅ NOVO: RATE LIMITING (100 req/min por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      100,
      60000, // 1 minuto
      userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de leitura de inventário`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const GLOBAL_ADMIN_ID = 1;

    // 1. BUSCA O "SEU" MUNDO (Importações Temporárias)
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

    // Cria um conjunto com os códigos que o usuário importou
    const importedProductCodes = new Set(
      myImportedBarcodes.map((b) => b.produto?.codigo_produto).filter(Boolean),
    );

    // Filtra o catálogo fixo: Remove itens que já existem na importação do usuário
    // Isso evita que o item apareça duas vezes ou que o saldo fixo sobrescreva o importado
    const uniqueCatalogProducts = fixedCatalogProducts.filter(
      (prod) => !importedProductCodes.has(prod.codigo_produto),
    );

    // ---------------------------------------------------

    // 4. TRANSFORMANDO O CATÁLOGO FILTRADO EM FORMATO DE CÓDIGO DE BARRAS
    const catalogAsBarcodes = uniqueCatalogProducts.map((prod) => ({
      codigo_de_barras: prod.codigo_produto,
      produto_id: prod.id,
      usuario_id: GLOBAL_ADMIN_ID,
      created_at: prod.created_at,
      produto: prod,
    }));

    // 5. UNIFICANDO AS LISTAS (Agora sem conflitos)
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
    const scope = searchParams.get("scope"); // 'catalog', 'counts', ou 'all' (padrão)

    // ✅ NOVO: RATE LIMITING DIFERENCIADO POR ESCOPO
    let rateLimitResult;

    if (scope === "catalog") {
      // Limpeza de catálogo: 5 req/hora
      rateLimitResult = withRateLimit(
        request,
        "user",
        5,
        3600000, // 1 hora
        userId,
      );
    } else {
      // Limpeza de contagens ou tudo: 10 req/hora
      rateLimitResult = withRateLimit(
        request,
        "user",
        10,
        3600000, // 1 hora
        userId,
      );
    }

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de limpeza (scope=${scope})`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const transactionOperations = [];

    // Filtros de Segurança (para não apagar itens FIXOS)
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
    // 2. LIMPAR APENAS CONTAGEM (MOVIMENTOS) - NOVO!
    else if (scope === "counts") {
      const sessoesUsuario = await prisma.sessao.findMany({
        where: { anfitriao_id: userId },
        select: { id: true },
      });
      const idsSessoes = sessoesUsuario.map((s) => s.id);

      transactionOperations.push(
        // Limpa movimentos das sessões
        prisma.movimento.deleteMany({
          where: { sessao_id: { in: idsSessoes } },
        }),
        // Limpa itens contados na tabela de auditoria
        prisma.itemContado.deleteMany({
          where: { contagem: { usuario_id: userId } },
        }),
        // Limpa a contagem pai
        prisma.contagem.deleteMany({ where: { usuario_id: userId } }),
        // NOTA: NÃO DELETA codigoBarras NEM produto AQUI
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
