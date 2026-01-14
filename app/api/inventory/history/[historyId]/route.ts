// app/api/inventory/history/[historyId]/route.ts
/**
 * Rota de API para gerenciar uma contagem salva específica do usuário.
 * Responsabilidades:
 * 1. GET: Recuperar detalhes de uma contagem salva.
 * 2. DELETE: Excluir uma contagem salva.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth"; // Mudança aqui
import { handleApiError } from "@/lib/api";

interface RouteParams {
  params: { historyId: string }; // userId removido dos params da rota
}

/**
 * Função INTELIGENTE para converter string em número.
 */
function parseNumber(val: string): number {
  if (!val) return 0;
  let clean = String(val).trim();

  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Função para parsear CSV com diferentes separadores
 */
/**
 * Função para parsear CSV com diferentes separadores
 * ATUALIZADA: Suporte para colunas de Valuation (Preço, Categoria)
 */
function parseCsvToItems(csvContent: string) {
  try {
    const lines = csvContent
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");

    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const separator = headerLine.includes(";") ? ";" : ",";

    const cleanCell = (val: string) =>
      val ? val.trim().replace(/^"|"$/g, "").trim() : "";

    const headers = headerLine.split(separator).map(cleanCell);

    return lines.slice(1).map((line, index) => {
      const rawValues = line.split(separator);
      const values = rawValues.map(cleanCell);
      const item: any = { id: index + 1 };

      headers.forEach((header, i) => {
        const value = values[i];
        const h = header.toLowerCase();

        // Mapeamento Flexível
        if (
          h.includes("barras") ||
          h === "codigo_de_barras" ||
          h.includes("ean")
        )
          item.codigo_de_barras = value;
        else if (h.includes("produto") || h === "codigo_produto")
          item.codigo_produto = value;
        else if (h.includes("descri") || h === "descricao")
          item.descricao = value;
        // --- NOVAS COLUNAS DE VALUATION ---
        else if (h.includes("categoria")) item.categoria = value;
        else if (
          h.includes("preco") ||
          h.includes("preço") ||
          h === "preco_unitario"
        )
          item.price = parseNumber(value); // Mapeia para item.price
        // ----------------------------------
        else if (h.includes("saldo") || h.includes("sistema"))
          item.saldo_estoque = parseNumber(value);
        else if (h.includes("loja") && !h.includes("valor"))
          item.quant_loja = parseNumber(value);
        else if (h.includes("estoque") && !h.includes("saldo"))
          item.quant_estoque = parseNumber(value);
        // Cuidado com "valor_total" vs "quantidade_total"
        else if (
          h === "quantidade_total" ||
          h === "total" ||
          h.includes("diferen")
        )
          item.total = parseNumber(value);
      });

      // Fallbacks para manter integridade
      if (item.quant_loja === undefined) item.quant_loja = 0;
      if (item.quant_estoque === undefined) item.quant_estoque = 0;

      if (item.total === undefined) {
        const contado = (item.quant_loja || 0) + (item.quant_estoque || 0);
        item.total = contado - (item.saldo_estoque || 0);
      }

      return item;
    });
  } catch (e) {
    console.error("Erro ao parsear CSV:", e);
    return [];
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Identificar Usuário pelo Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Pegar ID do item da URL
    const historyId = parseInt(params.historyId, 10);

    if (isNaN(historyId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const savedCount = await prisma.contagemSalva.findFirst({
      where: { id: historyId, usuario_id: userId },
    });

    if (!savedCount) {
      return NextResponse.json(
        { error: "Contagem não encontrada." },
        { status: 404 }
      );
    }

    const items = parseCsvToItems(savedCount.conteudo_csv);

    return NextResponse.json(
      {
        id: savedCount.id,
        data_contagem: savedCount.created_at,
        nome_arquivo: savedCount.nome_arquivo,
        items: items,
        csv_conteudo: savedCount.conteudo_csv,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Identificar Usuário pelo Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const historyId = parseInt(params.historyId, 10);

    if (isNaN(historyId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const result = await prisma.contagemSalva.deleteMany({
      where: { id: historyId, usuario_id: userId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Item não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Contagem excluída com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
