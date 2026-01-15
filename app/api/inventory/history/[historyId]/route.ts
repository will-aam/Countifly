// app/api/inventory/history/[historyId]/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

interface RouteParams {
  params: { historyId: string };
}

/**
 * Função INTELIGENTE para converter string em número.
 */
function parseNumber(val: string): number {
  if (!val) return 0;
  let clean = String(val).trim();

  // Remove R$ e espaços
  clean = clean.replace("R$", "").trim();

  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Função para parsear CSV com diferentes separadores
 * ATUALIZADA: Suporte total para Valuation (Subcategoria, Marca, sem saldo/diferença)
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

      // Objeto base limpo
      const item: any = {
        id: index + 1,
        quant_loja: 0,
        quant_estoque: 0,
        total: 0,
        price: 0,
        saldo_estoque: 0, // Mantemos 0 para não quebrar a tipagem, mas não lemos do CSV
      };

      headers.forEach((header, i) => {
        const value = values[i];
        const h = header.toLowerCase();

        // --- Identificação ---
        if (
          h.includes("barras") ||
          h === "codigo_de_barras" ||
          h.includes("ean")
        )
          item.codigo_de_barras = value;
        else if (h.includes("descri") || h === "descricao")
          item.descricao = value;
        // --- Taxonomia ---
        else if (h === "categoria") item.categoria = value;
        else if (h.includes("sub") || h === "subcategoria")
          item.subcategoria = value; // NOVO
        else if (h === "marca") item.marca = value; // NOVO
        // --- Financeiro ---
        else if (
          h.includes("preco") ||
          h.includes("preço") ||
          h === "preco_unitario"
        )
          item.price = parseNumber(value);
        // --- Quantidades (Valuation) ---
        else if (h.includes("loja") && !h.includes("valor"))
          item.quant_loja = parseNumber(value);
        else if (h.includes("estoque") && !h.includes("saldo"))
          item.quant_estoque = parseNumber(value);
        else if (h === "quantidade_total" || h === "total" || h === "qtd total")
          item.total = parseNumber(value);
      });

      // Recálculo de garantia: Se total não veio, soma as partes. Se veio, confia nele.
      if (item.total === 0 && (item.quant_loja > 0 || item.quant_estoque > 0)) {
        item.total = item.quant_loja + item.quant_estoque;
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
    const payload = await getAuthPayload();
    const userId = payload.userId;
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
