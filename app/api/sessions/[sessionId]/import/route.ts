// app/api/sessions/[sessionId]/import/route.ts
/**
 * Rota de Importação "PRO" (Ferrari) para Sessão Colaborativa.
 * Responsabilidade:
 * 1. Validar CSV linha a linha com feedback detalhado.
 * 2. Emitir eventos SSE em tempo real (progress, row_error, row_conflict).
 * 3. Usar transações atômicas para garantir consistência.
 * 4. Fornecer relatório completo de erros para o gestor.
 * 5. ✅ RATE LIMITING: 5 importações/hora por sessão, 5 limpezas/hora por usuário.
 * Segurança:
 * - Valida autenticação (JWT)
 * - Verifica se usuário é dono da sessão
 * - Limita tamanho de arquivo (5MB)
 * - Limita número de linhas (20k)
 * - ✅ Rate limiting anti-spam
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
import { getAuthPayload, AppError } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// ✅ CONFIGURAÇÕES
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 20000; // 20 mil linhas
const EXPECTED_HEADERS = [
  "codigo_de_barras",
  "codigo_produto",
  "descricao",
  "saldo_estoque",
];

interface CsvRow {
  codigo_de_barras: string;
  codigo_produto: string;
  descricao: string;
  saldo_estoque: string;
}

// ✅ Helper: Parse de números brasileiros (1.234,56 ou 1234.56)
function parseStockValue(value: string): number {
  if (!value) return 0;
  const clean = value.trim();
  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  if (hasComma && !hasDot) return parseFloat(clean.replace(",", "."));
  if (hasDot && !hasComma) return parseFloat(clean);
  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    if (lastComma > lastDot)
      return parseFloat(clean.replace(/\./g, "").replace(",", "."));
    else return parseFloat(clean.replace(/,/g, ""));
  }
  return parseFloat(clean);
}

export async function POST(request: NextRequest) {
  // ✅ 1. AUTENTICAÇÃO E AUTORIZAÇÃO
  let userId: number;
  let sessionId: number;

  try {
    const payload = await getAuthPayload();
    userId = payload.userId;

    const params = await request.url.match(/\/sessions\/(\d+)\/import/);
    if (!params || !params[1]) {
      return NextResponse.json(
        { error: "ID de sessão inválido na URL." },
        { status: 400 },
      );
    }

    sessionId = parseInt(params[1], 10);

    // Verifica se usuário é dono da sessão
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: { anfitriao_id: true, status: true },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    if (sessao.anfitriao_id !== userId) {
      return NextResponse.json(
        { error: "Acesso negado. Você não é o anfitrião desta sessão." },
        { status: 403 },
      );
    }

    if (sessao.status !== "ABERTA") {
      return NextResponse.json(
        { error: "Sessão não está aberta para importação." },
        { status: 409 },
      );
    }
  } catch (error: any) {
    console.error("Erro na autenticação/autorização:", error);
    return NextResponse.json(
      { error: "Não autenticado ou sessão inválida." },
      { status: 401 },
    );
  }

  // ✅ NOVO: RATE LIMITING (5 importações/hora por sessão)
  const rateLimitResult = withRateLimit(
    request,
    "session",
    5,
    3600000, // 1 hora
    undefined,
    sessionId,
  );

  if (rateLimitResult && !rateLimitResult.allowed) {
    console.warn(
      `[RATE LIMIT] Sessão ${sessionId} excedeu limite de importações (${rateLimitResult.retryAfter}s até reset)`,
    );
    return createRateLimitResponse(rateLimitResult);
  }

  // ✅ 2. VALIDAÇÃO DO ARQUIVO
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      },
      { status: 413 },
    );
  }

  if (!file.name.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Apenas arquivos CSV são permitidos." },
      { status: 400 },
    );
  }

  // ✅ 3. PARSE DO CSV
  const text = await file.text();
  const parseResult = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  });

  if (parseResult.errors.length > 0) {
    return NextResponse.json(
      {
        error: "Erro ao processar CSV.",
        details: parseResult.errors.map((e) => e.message),
      },
      { status: 400 },
    );
  }

  const rows = parseResult.data;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Arquivo CSV está vazio." },
      { status: 400 },
    );
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `Arquivo muito grande. Máximo: ${MAX_ROWS} linhas. Encontradas: ${rows.length}`,
      },
      { status: 413 },
    );
  }

  // ✅ 4. VALIDAÇÃO DE CABEÇALHOS
  const headers = Object.keys(rows[0]);
  const missingHeaders = EXPECTED_HEADERS.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        error: "Cabeçalhos faltando no CSV.",
        missing: missingHeaders,
        expected: EXPECTED_HEADERS,
      },
      { status: 400 },
    );
  }

  // ✅ 5. PROCESSAMENTO COM SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper para enviar eventos SSE
      function sendEvent(event: string, data: any) {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      }

      try {
        let importedCount = 0;
        let errorCount = 0;
        let conflictCount = 0;
        const totalRows = rows.length;

        sendEvent("start", { total: totalRows });

        // ✅ 6. PROCESSAR LINHA A LINHA
        for (const [index, row] of rows.entries()) {
          const rowNumber = index + 2; // +2 porque CSV começa na linha 2 (header = 1)

          // Normalização
          const codBarras = row.codigo_de_barras?.trim() || "";
          const codProduto = row.codigo_produto?.trim() || "";
          const descricao = row.descricao?.trim() || "";
          const saldoStr = row.saldo_estoque?.trim() || "0";

          // ✅ VALIDAÇÃO LINHA A LINHA
          const rowErrors: string[] = [];

          if (!codBarras) {
            rowErrors.push("Código de barras ausente");
          } else if (codBarras.length > 100) {
            rowErrors.push("Código de barras muito longo (máx: 100)");
          }

          if (!codProduto) {
            rowErrors.push("Código de produto ausente");
          } else if (codProduto.length > 50) {
            rowErrors.push("Código de produto muito longo (máx: 50)");
          }

          if (!descricao) {
            rowErrors.push("Descrição ausente");
          } else if (descricao.length > 255) {
            rowErrors.push("Descrição muito longa (máx: 255)");
          }

          const saldoNumerico = parseStockValue(saldoStr);
          if (isNaN(saldoNumerico)) {
            rowErrors.push(`Saldo inválido: "${saldoStr}"`);
          } else if (saldoNumerico < 0) {
            rowErrors.push("Saldo não pode ser negativo");
          } else if (saldoNumerico > 1000000) {
            rowErrors.push("Saldo muito alto (máx: 1.000.000)");
          }

          // ✅ Se tem erros, emite evento e pula linha
          if (rowErrors.length > 0) {
            errorCount++;
            sendEvent("row_error", {
              row: rowNumber,
              reasons: rowErrors,
              data: {
                codigo_de_barras: codBarras,
                codigo_produto: codProduto,
                descricao: descricao,
                saldo_estoque: saldoStr,
              },
            });
            continue; // Pula para próxima linha
          }

          // ✅ 7. INSERIR NO BANCO (TRANSAÇÃO ATÔMICA)
          try {
            await prisma.$transaction(async (tx) => {
              // Verifica se produto já existe na sessão
              const existing = await tx.produtoSessao.findUnique({
                where: {
                  sessao_id_codigo_produto: {
                    sessao_id: sessionId,
                    codigo_produto: codProduto,
                  },
                },
              });

              if (existing) {
                // ⚠️ Produto duplicado - emite conflito mas NÃO falha
                conflictCount++;
                sendEvent("row_conflict", {
                  row: rowNumber,
                  message:
                    "Código de produto já existe nesta sessão (ignorado)",
                  codigo_produto: codProduto,
                });
                return; // Não insere novamente
              }

              // Insere produto na sessão
              await tx.produtoSessao.create({
                data: {
                  sessao_id: sessionId,
                  codigo_produto: codProduto,
                  codigo_barras: codBarras || null,
                  descricao: descricao,
                  saldo_sistema: saldoNumerico,
                },
              });

              importedCount++;
            });
          } catch (error: any) {
            errorCount++;
            console.error(`Erro ao processar linha ${rowNumber}:`, error);
            sendEvent("row_error", {
              row: rowNumber,
              reasons: ["Erro interno no banco de dados"],
              data: { codigo_produto: codProduto },
            });
          }

          // ✅ 8. EMITIR PROGRESSO A CADA 10 LINHAS
          if (index % 10 === 0 || index === totalRows - 1) {
            sendEvent("progress", {
              current: index + 1,
              total: totalRows,
              imported: importedCount,
              errors: errorCount,
              conflicts: conflictCount,
            });
            // Libera event loop
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // ✅ 9. EVENTO FINAL
        sendEvent("complete", {
          imported: importedCount,
          errors: errorCount,
          conflicts: conflictCount,
          total: totalRows,
        });

        console.log(
          `[IMPORT] Sessão ${sessionId}: ${importedCount} importados, ${errorCount} erros, ${conflictCount} conflitos`,
        );
      } catch (error: any) {
        console.error("🔥 ERRO CRÍTICO NA IMPORTAÇÃO (SSE):", error);
        sendEvent("fatal", {
          error:
            error instanceof AppError
              ? error.message
              : "Erro interno no servidor.",
        });
      } finally {
        controller.close();
      }
    },
  });

  // ✅ 10. RETORNAR STREAM SSE
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx
    },
  });
}

// ✅ DELETE: Limpar produtos importados da sessão
export async function DELETE(request: NextRequest, props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
  try {
    // 1. Autenticação
    let userId: number;
    try {
      const payload = await getAuthPayload();
      userId = payload.userId;
    } catch (error: any) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "ID de sessão inválido." },
        { status: 400 },
      );
    }

    // ✅ NOVO: RATE LIMITING (5 limpezas/hora por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      5,
      3600000, // 1 hora
      userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${userId} excedeu limite de limpezas (${rateLimitResult.retryAfter}s até reset)`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Verifica se usuário é anfitrião da sessão
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: {
        anfitriao_id: true,
        _count: {
          select: {
            movimentos: true,
            produtos: true,
          },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    if (sessao.anfitriao_id !== userId) {
      return NextResponse.json(
        { error: "Apenas o anfitrião pode limpar a importação." },
        { status: 403 },
      );
    }

    // 3. Verifica se há contagens registradas
    if (sessao._count.movimentos > 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível limpar. Há contagens registradas nesta sessão.",
          movimentos: sessao._count.movimentos,
        },
        { status: 409 },
      );
    }

    // 4. Remove todos os produtos da sessão
    const deletedCount = await prisma.produtoSessao.deleteMany({
      where: { sessao_id: sessionId },
    });

    console.log(
      `[DELETE /api/sessions/${sessionId}/import] Removidos ${deletedCount.count} produtos`,
    );

    return NextResponse.json({
      success: true,
      deleted: deletedCount.count,
      message: "Catálogo limpo com sucesso.",
    });
  } catch (error: any) {
    console.error("[DELETE /api/sessions/import] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
