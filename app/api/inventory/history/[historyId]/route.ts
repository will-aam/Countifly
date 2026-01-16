// app/api/inventory/history/[historyId]/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

interface RouteParams {
  params: { historyId: string };
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

      const item: any = {
        id: index + 1,
        quant_loja: 0,
        quant_estoque: 0,
        total: 0,
        price: 0,
        saldo_estoque: 0,
        // codigo_produto: undefined // Será preenchido abaixo
      };

      headers.forEach((header, i) => {
        const value = values[i];
        const h = header.toLowerCase();

        // --- Identificação ---
        if (
          h.includes("barras") ||
          h === "codigo_de_barras" ||
          h.includes("ean")
        ) {
          item.codigo_de_barras = value;
        }
        // --- CÓDIGO INTERNO (Adicionado Aqui) ---
        else if (
          h === "codigo_produto" ||
          h === "código produto" ||
          h === "codigo interno" ||
          h === "sku" ||
          h === "referencia"
        ) {
          item.codigo_produto = value;
        }
        // ----------------------------------------
        else if (h.includes("descri") || h === "descricao") {
          item.descricao = value;
        } else if (h === "categoria") item.categoria = value;
        else if (h.includes("sub") || h === "subcategoria")
          item.subcategoria = value;
        else if (h === "marca") item.marca = value;
        // --- Financeiro ---
        else if (
          h.includes("preco") ||
          h.includes("preço") ||
          h === "preco_unitario"
        )
          item.price = parseNumber(value);
        // --- SISTEMA ---
        else if (
          h === "saldo_estoque" ||
          h === "sistema" ||
          h === "saldo" ||
          h === "estoque sistema"
        ) {
          item.saldo_estoque = parseNumber(value);
        }

        // --- Contagem Física ---
        else if (h.includes("loja") && !h.includes("valor"))
          item.quant_loja = parseNumber(value);
        // O "estoque" aqui é o Depósito
        else if (
          h.includes("estoque") &&
          !h.includes("saldo") &&
          !h.includes("sistema")
        )
          item.quant_estoque = parseNumber(value);
        // Total Contado
        else if (h === "quantidade_total" || h === "total" || h === "qtd total")
          item.total = parseNumber(value);
      });

      // Se não veio coluna "Total", somamos Loja + Estoque
      if (!item.total && (item.quant_loja > 0 || item.quant_estoque > 0)) {
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

    if (isNaN(historyId))
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const savedCount = await prisma.contagemSalva.findFirst({
      where: { id: historyId, usuario_id: userId },
    });

    if (!savedCount)
      return NextResponse.json(
        { error: "Contagem não encontrada." },
        { status: 404 }
      );

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
    if (isNaN(historyId))
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    const result = await prisma.contagemSalva.deleteMany({
      where: { id: historyId, usuario_id: userId },
    });
    if (result.count === 0)
      return NextResponse.json(
        { error: "Item não encontrado." },
        { status: 404 }
      );
    return NextResponse.json(
      { message: "Contagem excluída com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
