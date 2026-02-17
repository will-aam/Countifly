// app/api/sessions/[sessionId]/import/route.ts
/**
 * Rota de Importação de Produtos para uma Sessão Específica.
 * * Responsabilidade: Ler um CSV e preencher a tabela 'ProdutoSessao'.
 * * Segurança: Valida se o usuário do Token é o dono da Sessão.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
// CORREÇÃO: Importações separadas corretamente
import { getAuthPayload, createSseErrorResponse, AppError } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

// --- CONSTANTES ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 20000;
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

// Helper para parsear números brasileiros
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

// --- POST: Importar CSV ---
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const sessionId = parseInt(params.sessionId, 10);
  const encoder = new TextEncoder();

  if (isNaN(sessionId)) {
    return new Response(
      `data: ${JSON.stringify({ error: "ID de sessão inválido." })}\n\n`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Autenticação Segura (Via Token)
        const payload = await getAuthPayload();
        const userId = payload.userId;

        // 2. Verificar se a sessão existe e pertence ao usuário logado
        const sessao = await prisma.sessao.findUnique({
          where: { id: sessionId },
        });

        if (!sessao || sessao.anfitriao_id !== userId) {
          createSseErrorResponse(
            controller,
            encoder,
            "Sessão não encontrada ou acesso negado.",
            404,
          );
          return;
        }

        // 3. Processar Upload
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
          createSseErrorResponse(
            controller,
            encoder,
            "Nenhum arquivo enviado.",
            400,
          );
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          createSseErrorResponse(
            controller,
            encoder,
            `Limite de 5MB excedido.`,
            413,
          );
          return;
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
          createSseErrorResponse(
            controller,
            encoder,
            "Apenas arquivos .csv permitidos.",
            400,
          );
          return;
        }

        const csvText = await file.text();
        const parseResult = Papa.parse<CsvRow>(csvText, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

        if (parseResult.errors.length > 0 && parseResult.errors.length > 5) {
          createSseErrorResponse(
            controller,
            encoder,
            "Erro crítico ao ler CSV.",
            400,
          );
          return;
        }

        const headers = parseResult.meta.fields || [];
        const missingHeaders = EXPECTED_HEADERS.filter(
          (h) => !headers.includes(h),
        );

        if (missingHeaders.length > 0) {
          createSseErrorResponse(
            controller,
            encoder,
            `Colunas faltando: ${missingHeaders.join(", ")}.`,
            400,
          );
          return;
        }

        const totalRows = parseResult.data.length;
        if (totalRows > MAX_ROWS) {
          createSseErrorResponse(
            controller,
            encoder,
            `Limite de ${MAX_ROWS} linhas excedido.`,
            400,
          );
          return;
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", total: totalRows })}\n\n`,
          ),
        );

        let importedCount = 0;
        let errorCount = 0;

        // 4. Iterar e Salvar
        for (const [index, row] of parseResult.data.entries()) {
          const saldo = parseStockValue(row.saldo_estoque);
          const codProduto = row.codigo_produto?.trim();
          const codBarras = row.codigo_de_barras?.trim();
          const descricao = row.descricao?.trim();

          if (isNaN(saldo) || !codProduto) {
            errorCount++;
            continue;
          }

          try {
            await prisma.produtoSessao.upsert({
              where: {
                sessao_id_codigo_produto: {
                  sessao_id: sessionId,
                  codigo_produto: codProduto,
                },
              },
              update: {
                descricao: descricao,
                saldo_sistema: saldo,
                codigo_barras: codBarras,
              },
              create: {
                sessao_id: sessionId,
                codigo_produto: codProduto,
                descricao: descricao || "Sem descrição",
                saldo_sistema: saldo,
                codigo_barras: codBarras,
              },
            });
            importedCount++;
          } catch (error) {
            console.error(`Erro linha ${index}:`, error);
            errorCount++;
          }

          if (index % 50 === 0 || index === totalRows - 1) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  current: index + 1,
                  total: totalRows,
                  imported: importedCount,
                  errors: errorCount,
                })}\n\n`,
              ),
            );
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // 5. Finalizar
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              importedCount,
              errorCount,
            })}\n\n`,
          ),
        );
      } catch (error: any) {
        if (error instanceof AppError) {
          createSseErrorResponse(
            controller,
            encoder,
            error.message,
            error.statusCode,
          );
        } else {
          console.error("ERRO CRÍTICO IMPORT SSE:", error);
          createSseErrorResponse(
            controller,
            encoder,
            "Erro interno no servidor.",
            500,
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// --- DELETE: Limpar Catálogo da Sessão ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "ID de sessão inválido." },
        { status: 400 },
      );
    }

    // 1. Identificar Usuário
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Verificar permissão (Anfitrião) e contar movimentos
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { movimentos: true }, // ✅ Conta quantos movimentos existem
        },
      },
    });

    if (!sessao || sessao.anfitriao_id !== userId) {
      return NextResponse.json(
        { error: "Permissão negada ou sessão não encontrada." },
        { status: 403 },
      );
    }

    // ✅ 3. VALIDAÇÃO CRÍTICA: Bloqueia se tiver movimentos
    const movimentosCount = sessao._count.movimentos;

    if (movimentosCount > 0) {
      return NextResponse.json(
        {
          error: `Não é possível limpar o catálogo. Já existem ${movimentosCount} registros de contagem nesta sessão.`,
          movimentos: movimentosCount,
          hint: "Encerre a sessão para gerar o relatório final, ou exclua os movimentos primeiro (não recomendado).",
        },
        { status: 409 }, // ✅ Conflict
      );
    }

    // 4. Se chegou aqui, pode limpar (sessão está vazia)
    await prisma.produtoSessao.deleteMany({
      where: { sessao_id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: "Catálogo da sessão limpo com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao limpar catálogo:", error);
    return handleApiError(error);
  }
}
