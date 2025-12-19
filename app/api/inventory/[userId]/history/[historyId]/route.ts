// app/api/inventory/[userId]/history/[historyId]/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

interface RouteParams {
  params: {
    userId: string;
    historyId: string;
  };
}

/**
 * Função Inteligente para ler CSV (Padrão BR ou US).
 * Resolve o problema de "tudo numa coluna só" e remove aspas extras.
 */
function parseCsvToItems(csvContent: string) {
  try {
    const lines = csvContent
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");
    if (lines.length < 2) return []; // Só tem cabeçalho ou vazio

    // 1. Detectar Separador (A Mágica)
    // Se a primeira linha tiver ';', assumimos que é Ponto e Vírgula (Excel BR).
    const headerLine = lines[0];
    const separator = headerLine.includes(";") ? ";" : ",";

    // Função auxiliar para limpar aspas de uma célula: "Texto" -> Texto
    const cleanCell = (val: string) =>
      val ? val.trim().replace(/^"|"$/g, "").trim() : "";

    // 2. Parsear Cabeçalhos
    // Regex segura que respeita separadores dentro de aspas, mas aqui vamos simplificar com split
    // pois o separador ';' é seguro. Para vírgula, o split simples pode falhar se tiver vírgula no nome,
    // mas vamos assumir o padrão ';' que você descreveu.
    const headers = headerLine.split(separator).map(cleanCell);

    return lines.slice(1).map((line, index) => {
      // Divide a linha usando o separador detectado
      const rawValues = line.split(separator);
      const values = rawValues.map(cleanCell);

      const item: any = { id: index + 1 }; // ID temporário para a lista visual

      // 3. Mapeamento Flexível (Headers -> Propriedades JSON)
      headers.forEach((header, i) => {
        const value = values[i];
        const h = header.toLowerCase();

        if (
          h.includes("barras") ||
          h.includes("ean") ||
          h === "codigo_de_barras"
        )
          item.codigo_de_barras = value;
        else if (
          h.includes("produto") ||
          h.includes("interno") ||
          h === "codigo_produto"
        )
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
    console.error("Erro crítico ao parsear CSV:", e);
    return [];
  }
}

function parseNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// --- ROTAS (GET e DELETE) ---

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
      { message: "Excluído com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
