// app/api/inventory/[userId]/session/[sessionId]/import/route.ts
/**
 * Rota de Importação de Produtos para uma Sessão Específica.
 * Responsabilidade: Ler um CSV e preencher a tabela 'ProdutoSessao'.
 * Utiliza SSE (Server-Sent Events) para feedback de progresso em tempo real.
 *
 * BLINDAGEM APLICADA: Tratamento de erros seguro e sem vazamento de detalhes internos.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
import { Prisma } from "@prisma/client";
// Importamos AppError para verificar tipos de erro seguramente
import { validateAuth, createSseErrorResponse, AppError } from "@/lib/auth";

// --- CONSTANTES DE CONFIGURAÇÃO ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 20000; // Limite seguro
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

// Função auxiliar para converter valores de estoque com formatação brasileira
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

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string; sessionId: string } }
) {
  const userId = parseInt(params.userId, 10);
  const sessionId = parseInt(params.sessionId, 10);
  const encoder = new TextEncoder();

  if (isNaN(userId) || isNaN(sessionId)) {
    return new Response(
      `data: ${JSON.stringify({ error: "IDs inválidos." })}\n\n`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Validação de Segurança (Lança AppError/AuthError se falhar)
        await validateAuth(request, userId);

        // 2. Verificar se a sessão existe e pertence ao usuário
        const sessao = await prisma.sessao.findUnique({
          where: { id: sessionId },
        });

        if (!sessao || sessao.anfitriao_id !== userId) {
          // Erro de negócio controlado (pode ser visto pelo usuário)
          createSseErrorResponse(
            controller,
            encoder,
            "Sessão não encontrada ou acesso negado.",
            404
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
            400
          );
          return;
        }

        // Validação de Tamanho
        if (file.size > MAX_FILE_SIZE) {
          createSseErrorResponse(
            controller,
            encoder,
            `Arquivo muito grande. O limite é de 5MB.`,
            413
          );
          return;
        }

        // Validação de Tipo
        if (!file.name.toLowerCase().endsWith(".csv")) {
          createSseErrorResponse(
            controller,
            encoder,
            "Apenas arquivos .csv são permitidos.",
            400
          );
          return;
        }

        const csvText = await file.text();
        const parseResult = Papa.parse<CsvRow>(csvText, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

        if (parseResult.errors.length > 0) {
          createSseErrorResponse(
            controller,
            encoder,
            "Erro ao ler CSV ou formato inválido.",
            400
          );
          return;
        }

        // Validação de Colunas
        const headers = parseResult.meta.fields || [];
        const missingHeaders = EXPECTED_HEADERS.filter(
          (h) => !headers.includes(h)
        );

        if (missingHeaders.length > 0) {
          createSseErrorResponse(
            controller,
            encoder,
            `Colunas obrigatórias faltando: ${missingHeaders.join(", ")}.`,
            400
          );
          return;
        }

        const totalRows = parseResult.data.length;

        // Limite de Linhas
        if (totalRows > MAX_ROWS) {
          createSseErrorResponse(
            controller,
            encoder,
            `Limite excedido. Máximo de ${MAX_ROWS} linhas.`,
            400
          );
          return;
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", total: totalRows })}\n\n`
          )
        );

        let importedCount = 0;
        let errorCount = 0;

        // 4. Iterar e Salvar no Banco
        for (const [index, row] of parseResult.data.entries()) {
          // Tratamento básico de dados com nossa função robusta
          const saldo = parseStockValue(row.saldo_estoque);
          const codProduto = row.codigo_produto?.trim();
          const codBarras = row.codigo_de_barras?.trim();
          const descricao = row.descricao?.trim();

          if (isNaN(saldo) || !codProduto) {
            errorCount++;
            continue;
          }

          try {
            // Upsert: Cria ou Atualiza o produto DENTRO desta sessão
            await prisma.produtoSessao.upsert({
              where: {
                sessao_id_codigo_produto: {
                  sessao_id: sessionId,
                  codigo_produto: codProduto,
                },
              },
              update: {
                descricao: descricao,
                saldo_sistema: saldo, // Decimal/Float
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
            // Log interno apenas
            console.error(`Erro na linha ${index}:`, error);
            errorCount++;
          }

          // Enviar progresso a cada 50 itens
          if (index % 50 === 0 || index === totalRows - 1) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  current: index + 1,
                  total: totalRows,
                  imported: importedCount,
                  errors: errorCount,
                })}\n\n`
              )
            );
            // Yield para não travar o loop
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
            })}\n\n`
          )
        );
      } catch (error: any) {
        // --- TRATAMENTO DE ERRO BLINDADO (NOVO) ---
        if (error instanceof AppError) {
          // Erros operacionais conhecidos (Auth, 404, 400)
          createSseErrorResponse(
            controller,
            encoder,
            error.message,
            error.statusCode
          );
        } else {
          // Erros inesperados (Crash, Banco, Bug)
          console.error("ERRO CRÍTICO NA IMPORTAÇÃO DE SESSÃO (SSE):", error);
          createSseErrorResponse(
            controller,
            encoder,
            "Ocorreu um erro interno no servidor durante o processamento.",
            500
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
