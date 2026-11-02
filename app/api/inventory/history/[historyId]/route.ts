// app/api/inventory/history/[historyId]/route.ts
// Rota de API para gerenciar o histórico de contagens salvas do usuário.
// Responsabilidades:
// 1. GET: Obter detalhes de uma contagem salva específica (incluindo o conteúdo CSV e os itens parseados).
// 2. DELETE: Excluir uma contagem salva específica.

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import * as Papa from "papaparse";
import {
  normalizeSavedCountFileName,
  sanitizeSavedCountCsv,
  SavedCountValidationError,
} from "@/lib/csv-security";

interface RouteParams {
  params: Promise<{ historyId: string }>;
}

function parseNumber(val: string): number {
  if (!val) return 0;
  let clean = String(val).trim();
  clean = clean.replace("R$", "").trim();
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseCsvToItems(csvContent: string) {
  try {
    const parsed = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: "greedy",
      delimitersToGuess: [";", ",", "\t", "|"],
    });
    const normalizeHeader = (header: string) =>
      header.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    return parsed.data.map((row, index) => {
      const values = new Map(
        Object.entries(row).map(([header, value]) => [normalizeHeader(header), value]),
      );
      const get = (...headers: string[]) => {
        for (const header of headers) {
          const value = values.get(normalizeHeader(header));
          if (value != null && String(value).trim() !== "") return String(value).trim();
        }
        return "";
      };
      const storeQuantity = parseNumber(get("Loja", "quant_loja", "quantidade loja"));
      const stockQuantity = parseNumber(get("Estoque", "quant_estoque", "deposito", "depósito"));
      const explicitTotal = get("Quantidade", "Quantidade Total", "quantidade_total", "Qtd Total", "Total Contado", "total");

      return {
        id: index + 1,
        codigo_de_barras: get("EAN/Código", "codigo_de_barras", "código de barras", "EAN", "barcode"),
        codigo_produto: get("codigo_produto", "código produto", "codigo interno", "SKU", "referencia"),
        descricao: get("Descrição", "descricao", "description"),
        categoria: get("Categoria", "category") || "Geral",
        subcategoria: get("Subcategoria", "subcategory"),
        marca: get("Marca", "brand"),
        quant_loja: storeQuantity,
        quant_estoque: stockQuantity,
        total: explicitTotal ? parseNumber(explicitTotal) : storeQuantity + stockQuantity,
        quantity: 0,
        price: parseNumber(get("Preço Unit.", "preco_unitario", "preço", "preco")),
        saldo_estoque: parseNumber(get("Saldo Estoque", "Sistema", "saldo", "estoque sistema")),
      };
    }).filter((item) => item.codigo_de_barras || item.codigo_produto || item.descricao);
  } catch (e) {
    console.error("Erro ao parsear CSV:", e);
    return [];
  }
}

export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;
    const historyId = parseInt(params.historyId, 10);

    if (isNaN(historyId))
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const savedCount = await prisma.contagemSalva.findFirst({
      where: { id: historyId, usuario_id: userId },
    });

    if (!savedCount)
      return NextResponse.json(
        { error: "Contagem não encontrada." },
        { status: 404 },
      );

    let safeCsvContent: string;
    try {
      safeCsvContent = sanitizeSavedCountCsv(savedCount.conteudo_csv);
    } catch (error) {
      if (error instanceof SavedCountValidationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const items = parseCsvToItems(safeCsvContent);

    return NextResponse.json(
      {
        id: savedCount.id,
        data_contagem: savedCount.created_at,
        nome_arquivo: normalizeSavedCountFileName(savedCount.nome_arquivo),
        items: items,
        csv_conteudo: safeCsvContent,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;
    const historyId = parseInt(params.historyId, 10);
    if (isNaN(historyId))
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    const result = await prisma.contagemSalva.deleteMany({
      where: { id: historyId, usuario_id: userId },
    });
    if (result.count === 0)
      return NextResponse.json(
        { error: "Item não encontrado." },
        { status: 404 },
      );
    return NextResponse.json(
      { message: "Contagem excluída com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
