// app/api/inventory/[userId]/history/[historyId]/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

interface RouteParams {
  params: { userId: string; historyId: string };
}

/**
 * Função INTELIGENTE para converter string em número.
 * Corrige o erro onde 2.999 virava 2999.
 */
function parseNumber(val: string): number {
  if (!val) return 0;
  // Converte para string e remove espaços
  let clean = String(val).trim();

  // LÓGICA HÍBRIDA:
  // 1. Se tiver vírgula (ex: "1.000,50"), assumimos padrão BR.
  if (clean.includes(",")) {
    // Remove os pontos de milhar e troca a vírgula por ponto decimal
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  // 2. Se NÃO tiver vírgula, mas tiver ponto (ex: "2.999"), assumimos padrão Internacional/Banco.
  //    Nesse caso, NÃO removemos o ponto, pois ele é o decimal!

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Função para parsear CSV com diferentes separadores
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

        if (h.includes("barras") || h === "codigo_de_barras")
          item.codigo_de_barras = value;
        else if (h.includes("produto") || h === "codigo_produto")
          item.codigo_produto = value;
        else if (h.includes("descri") || h === "descricao")
          item.descricao = value;
        else if (h.includes("saldo") || h.includes("sistema"))
          item.saldo_estoque = parseNumber(value);
        else if (h.includes("loja")) item.quant_loja = parseNumber(value);
        else if (h.includes("estoque") && !h.includes("saldo"))
          item.quant_estoque = parseNumber(value);
        else if (h.includes("total") || h.includes("diferen"))
          item.total = parseNumber(value);
        else if (h.includes("local")) item.local_estoque = value;
      });

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
    const userId = parseInt(params.userId, 10);
    const historyId = parseInt(params.historyId, 10);

    if (isNaN(userId) || isNaN(historyId)) {
      return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
    }

    await validateAuth(request, userId);

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
    const userId = parseInt(params.userId, 10);
    const historyId = parseInt(params.historyId, 10);

    if (isNaN(userId) || isNaN(historyId)) {
      return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
    }

    await validateAuth(request, userId);

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
