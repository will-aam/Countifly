// app/api/inventory/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

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
    const GLOBAL_ADMIN_ID = 1;

    // 1. BUSCA O "SEU" MUNDO (Importações Temporárias)
    // Aqui a lógica continua a mesma: Busca na tabela de ligação CodigoBarras
    const myImportedBarcodes = await prisma.codigoBarras.findMany({
      where: { usuario_id: userId },
      include: { produto: true },
    });

    // 2. BUSCA O "CATÁLOGO" (Itens Fixos)
    // AQUI ESTÁ A CORREÇÃO: Buscamos direto na tabela Produto.
    // Onde 'codigo_produto' atua como o código de barras.
    const fixedCatalogProducts = await prisma.produto.findMany({
      where: {
        usuario_id: GLOBAL_ADMIN_ID,
        tipo_cadastro: "FIXO",
      },
    });

    // 3. TRANSFORMANDO O CATÁLOGO EM FORMATO DE CÓDIGO DE BARRAS
    // O Frontend espera receber uma lista de "barCodes".
    // Vamos "fingir" que os produtos fixos têm um registro de código de barras.
    const catalogAsBarcodes = fixedCatalogProducts.map((prod) => ({
      codigo_de_barras: prod.codigo_produto, // <--- O PULO DO GATO: Usamos o codigo_produto como Barcode
      produto_id: prod.id,
      usuario_id: GLOBAL_ADMIN_ID,
      created_at: prod.created_at,
      produto: prod, // Anexamos o produto completo
    }));

    // 4. UNIFICANDO AS LISTAS
    // Juntamos o que você importou com o catálogo fixo
    const allBarCodes = [...myImportedBarcodes, ...catalogAsBarcodes];

    // 5. PREPARANDO A LISTA DE PRODUTOS (Frontend precisa dessa lista separada também)
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

    console.log(
      `[API] Total unificado: ${allBarCodes.length} itens (Importados: ${myImportedBarcodes.length} | Catálogo: ${catalogAsBarcodes.length})`
    );

    return NextResponse.json({
      products: allProducts,
      barCodes: allBarCodes,
    });
  } catch (error) {
    console.error("[API ERROR]", error);
    return handleApiError(error);
  }
}

// --- DELETE (Mantido e Seguro) ---
// Continua apagando apenas o que NÃO é FIXO, garantindo segurança.
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    const transactionOperations = [];

    // Filtros de Segurança
    const filtroSegurancaProdutos = {
      usuario_id: userId,
      tipo_cadastro: { not: "FIXO" },
    };

    const filtroSegurancaBarras = {
      usuario_id: userId,
      produto: { tipo_cadastro: { not: "FIXO" } },
    };

    if (scope === "catalog") {
      transactionOperations.push(
        prisma.codigoBarras.deleteMany({ where: filtroSegurancaBarras }),
        prisma.produto.deleteMany({ where: filtroSegurancaProdutos })
      );
    } else {
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
        prisma.produto.deleteMany({ where: filtroSegurancaProdutos })
      );
    }

    await prisma.$transaction(transactionOperations);
    return NextResponse.json({ success: true, message: "Limpeza concluída." });
  } catch (error) {
    return handleApiError(error);
  }
}
