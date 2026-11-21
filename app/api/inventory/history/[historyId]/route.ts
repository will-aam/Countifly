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
    // Remove linhas de comentário (# COUNTIFLY_METADATA: ...) antes de parsear cabeçalhos
    const cleanCsv = csvContent.replace(/^#[^\r\n]*(?:\r\n|\r|\n)?/gm, "");

    const parsed = Papa.parse<Record<string, string>>(cleanCsv, {
      header: true,
      skipEmptyLines: "greedy",
      comments: "#",
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
      const storeQuantity = parseNumber(get("loja", "quant_loja", "quantidade loja"));
      const stockQuantity = parseNumber(get("estoque", "quant_estoque", "deposito", "depósito"));
      const explicitTotal = get("quantidade", "quantidade total", "quantidade_total", "qtd total", "total contado", "total");
      const computedTotal = explicitTotal ? parseNumber(explicitTotal) : storeQuantity + stockQuantity;
      const unitCost = parseNumber(get("custo unitario", "custo unitário", "custo", "preco unit.", "preco_unitario", "preço", "preco"));
      const totalVal = parseNumber(get("valor total", "valor_total")) || (computedTotal * unitCost);

      return {
        id: index + 1,
        codigo_de_barras: get("ean/codigo", "codigo de barras", "codigo_de_barras", "código de barras", "ean", "barcode"),
        codigo_produto: get("codigo do produto", "codigo_produto", "código produto", "codigo interno", "sku", "referencia"),
        descricao: get("descricao", "descrição", "description"),
        ncm: get("ncm", "codigo ncm", "codigo_ncm", "código ncm", "classificacao fiscal", "classificacao_fiscal"),
        localizacao: get("localizacao", "localização", "local", "endereco", "endereço"),
        validade: get("validade", "data de validade", "data_validade", "vencimento"),
        lote: get("lote"),
        status: get("status", "condicao", "condição") || "NORMAL",
        status_item: get("status", "status_item", "condicao", "condição") || "NORMAL",
        categoria: get("categoria", "category") || "Geral",
        subcategoria: get("subcategoria", "subcategory"),
        marca: get("marca", "brand"),
        quant_loja: storeQuantity,
        quant_estoque: stockQuantity,
        quantidade: computedTotal,
        total: computedTotal,
        quantity: computedTotal,
        custo: unitCost,
        price: unitCost,
        valor_total: totalVal,
        curva_abc: get("curva abc", "curva_abc", "classe") || "C",
        tipo_local: get("tipo de local", "tipo_local") || (stockQuantity > 0 ? "ESTOQUE" : "LOJA"),
        data_hora: get("data e hora", "data_hora", "data", "hora"),
        saldo_estoque: parseNumber(get("saldo estoque", "sistema", "saldo", "estoque sistema")),
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

    // Tentar extrair metadados do CSV se existirem no cabeçalho
    let metaSnapshot = (savedCount as any).data_fotografia || null;
    let metaCorteEntrada = (savedCount as any).corte_entrada || null;
    let metaCorteSaida = (savedCount as any).corte_saida || null;
    let metaRecountLogs: any[] = [];

    const metaMatch = safeCsvContent.match(/#\s*COUNTIFLY_METADATA:\s*({.*})/);
    if (metaMatch) {
      try {
        const parsedMeta = JSON.parse(metaMatch[1]);
        if (!metaSnapshot && parsedMeta.data_fotografia) metaSnapshot = parsedMeta.data_fotografia;
        if (!metaCorteEntrada && parsedMeta.corte_entrada) metaCorteEntrada = parsedMeta.corte_entrada;
        if (!metaCorteSaida && parsedMeta.corte_saida) metaCorteSaida = parsedMeta.corte_saida;
        if (Array.isArray(parsedMeta.recount_logs)) metaRecountLogs = parsedMeta.recount_logs;
      } catch {
        // Ignora erro de parse nos metadados opcionais
      }
    }

    return NextResponse.json(
      {
        id: savedCount.id,
        tipo_contagem: savedCount.tipo_contagem,
        empresa_id: savedCount.empresa_id,
        data_contagem: savedCount.created_at,
        data_fotografia: metaSnapshot,
        corte_entrada: metaCorteEntrada,
        corte_saida: metaCorteSaida,
        recount_logs: metaRecountLogs,
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
