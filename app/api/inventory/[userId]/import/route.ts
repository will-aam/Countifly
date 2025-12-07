// app/api/inventory/[userId]/import/route.ts
/**
 * Rota de API para importação de produtos (Single Player) - VERSÃO BLINDADA 🛡️
 *
 * Melhorias:
 * 1. Validação de Tipo de Arquivo e Tamanho.
 * 2. Validação de Cabeçalhos (Schema do CSV).
 * 3. Limites de Linhas (Proteção contra DoS/Timeout).
 * 4. Feedback Granular via SSE (row_error, row_conflict).
 * 5. Atomicidade por Linha (Mantida da versão anterior).
 * 6. Detecção de Duplicatas *dentro do próprio arquivo* (NOVO).
 * 7. Tratamento de Erros Seguro (AppError).
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
import { Prisma } from "@prisma/client";
// Importamos AppError para verificar tipos de erro seguramente
import { validateAuth, AppError } from "@/lib/auth";

// --- CONSTANTES DE CONFIGURAÇÃO ---
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 10000; // Limite seguro para evitar timeout em serverless
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

// ✅ NOVA LÓGICA INTELIGENTE (Parse de valores numéricos)
function parseStockValue(value: string): number {
  if (!value) return 0;

  const clean = value.trim();

  // Verifica quais separadores existem no número
  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  // CASO 1: Apenas Vírgula (ex: "1,567") -> Entende como decimal (BR)
  if (hasComma && !hasDot) {
    return parseFloat(clean.replace(",", "."));
  }

  // CASO 2: Apenas Ponto (ex: "1.567") -> Entende como decimal (US)
  if (hasDot && !hasComma) {
    return parseFloat(clean);
  }

  // CASO 3: Tem os dois (ex: "1.500,50" ou "1,500.50")
  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");

    if (lastComma > lastDot) {
      // Padrão BR (1.500,50) -> Último separador é vírgula
      // Remove pontos de milhar e troca vírgula final por ponto
      return parseFloat(clean.replace(/\./g, "").replace(",", "."));
    } else {
      // Padrão US (1,500.50) -> Último separador é ponto
      // Remove vírgulas de milhar e mantém o ponto
      return parseFloat(clean.replace(/,/g, ""));
    }
  }

  // CASO 4: Número limpo (ex: "100")
  return parseFloat(clean);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = parseInt(params.userId, 10);
  const encoder = new TextEncoder();

  // 1. Validação de ID (Rápida)
  if (isNaN(userId)) {
    return new Response(
      `data: ${JSON.stringify({
        type: "fatal",
        error: "ID de usuário inválido.",
      })}\n\n`,
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

  // Inicia o stream SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Helper interno para enviar eventos SSE padronizados
      const sendEvent = (type: string, payload: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        );
      };

      try {
        // 2. Autenticação e Segurança (Lança AppError se falhar)
        await validateAuth(request, userId);

        const formData = await request.formData();
        const file = formData.get("file") as File;

        // 3. Validação de Arquivo (Existência e Tipo)
        if (!file) {
          sendEvent("fatal", { error: "Nenhum arquivo enviado." });
          controller.close();
          return;
        }

        if (
          !file.name.toLowerCase().endsWith(".csv") &&
          file.type !== "text/csv" &&
          file.type !== "application/vnd.ms-excel"
        ) {
          sendEvent("fatal", {
            error: "Formato inválido. Envie um arquivo .csv.",
          });
          controller.close();
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          sendEvent("fatal", {
            error: `Arquivo muito grande. Limite: ${
              MAX_FILE_SIZE / 1024 / 1024
            }MB.`,
          });
          controller.close();
          return;
        }

        // 4. Parsing do CSV
        const csvText = await file.text();
        const parseResult = Papa.parse<CsvRow>(csvText, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

        // 5. Validação de Erros de Parsing
        if (parseResult.errors.length > 0) {
          if (parseResult.errors.length > 10) {
            sendEvent("fatal", {
              error: "Arquivo CSV corrompido ou formato inválido.",
              details: parseResult.errors.slice(0, 5),
            });
            controller.close();
            return;
          }
        }

        // 6. Validação de Cabeçalhos (Schema)
        const fileHeaders = parseResult.meta.fields || [];
        const missingHeaders = EXPECTED_HEADERS.filter(
          (h) => !fileHeaders.includes(h)
        );

        if (missingHeaders.length > 0) {
          sendEvent("fatal", {
            error: "Colunas obrigatórias faltando.",
            missing: missingHeaders,
            expected: EXPECTED_HEADERS,
          });
          controller.close();
          return;
        }

        // 7. Validação de Limites
        const totalRows = parseResult.data.length;
        if (totalRows > MAX_ROWS) {
          sendEvent("fatal", {
            error: `Limite excedido. Máximo de ${MAX_ROWS} linhas permitidas.`,
          });
          controller.close();
          return;
        }

        // --- INÍCIO DO PROCESSAMENTO ---
        sendEvent("start", { total: totalRows });

        let importedCount = 0;
        let errorCount = 0;
        let conflictCount = 0;

        // Rastreadores de Duplicidade no Arquivo
        const seenProductCodes = new Map<string, number>();
        const seenBarcodes = new Map<string, number>();

        // Loop linha a linha
        for (const [index, row] of parseResult.data.entries()) {
          const rowNumber = index + 2;

          // A. Validação de Dados da Linha
          const saldoNumerico = parseStockValue(row.saldo_estoque);
          const codProduto = row.codigo_produto?.trim();
          const codBarras = row.codigo_de_barras?.trim();
          const descricao = row.descricao?.trim();

          const rowErrors = [];
          if (!codProduto) rowErrors.push("Código do Produto vazio");
          if (!codBarras) rowErrors.push("Código de Barras vazio");
          if (isNaN(saldoNumerico)) rowErrors.push("Saldo inválido");

          // Validação de Duplicidade Interna
          if (codProduto) {
            if (seenProductCodes.has(codProduto)) {
              const prevLine = seenProductCodes.get(codProduto);
              rowErrors.push(
                `Código do Produto repetido neste arquivo (1ª vez na linha ${prevLine})`
              );
            } else {
              seenProductCodes.set(codProduto, rowNumber);
            }
          }

          if (codBarras) {
            if (seenBarcodes.has(codBarras)) {
              const prevLine = seenBarcodes.get(codBarras);
              rowErrors.push(
                `Código de Barras repetido neste arquivo (1ª vez na linha ${prevLine})`
              );
            } else {
              seenBarcodes.set(codBarras, rowNumber);
            }
          }

          if (rowErrors.length > 0) {
            errorCount++;
            sendEvent("row_error", {
              row: rowNumber,
              reasons: rowErrors,
              data: row,
            });
            if (index % 10 === 0 || index === totalRows - 1) {
              sendEvent("progress", {
                current: index + 1,
                total: totalRows,
                imported: importedCount,
                errors: errorCount + conflictCount,
              });
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
            continue;
          }

          // B. Persistência com Atomicidade
          try {
            await prisma.$transaction(async (tx) => {
              // 1. Produto
              const product = await tx.produto.upsert({
                where: {
                  codigo_produto_usuario_id: {
                    codigo_produto: codProduto!,
                    usuario_id: userId,
                  },
                },
                update: {
                  descricao: descricao,
                  saldo_estoque: saldoNumerico,
                },
                create: {
                  codigo_produto: codProduto!,
                  descricao: descricao || "Sem descrição",
                  saldo_estoque: saldoNumerico,
                  usuario_id: userId,
                },
              });

              // 2. Código de Barras
              await tx.codigoBarras.upsert({
                where: {
                  codigo_de_barras_usuario_id: {
                    codigo_de_barras: codBarras!,
                    usuario_id: userId,
                  },
                },
                update: {
                  produto_id: product.id,
                },
                create: {
                  codigo_de_barras: codBarras!,
                  produto_id: product.id,
                  usuario_id: userId,
                },
              });

              // 3. Limpeza de Órfãos
              await tx.codigoBarras.deleteMany({
                where: {
                  produto_id: product.id,
                  usuario_id: userId,
                  NOT: {
                    codigo_de_barras: codBarras!,
                  },
                },
              });
            });

            importedCount++;
          } catch (error: any) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              conflictCount++;
              sendEvent("row_conflict", {
                row: rowNumber,
                message: "Código já existe em outro produto.",
                barcode: codBarras,
              });
            } else {
              errorCount++;
              console.error(`Erro linha ${rowNumber}:`, error);
              sendEvent("row_error", {
                row: rowNumber,
                reasons: ["Erro interno no banco de dados"],
              });
            }
          }

          // D. Feedback de Progresso
          if (index % 10 === 0 || index === totalRows - 1) {
            sendEvent("progress", {
              current: index + 1,
              total: totalRows,
              imported: importedCount,
              errors: errorCount + conflictCount,
            });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // 8. Finalização
        sendEvent("complete", {
          imported: importedCount,
          errors: errorCount,
          conflicts: conflictCount,
          total: totalRows,
        });
      } catch (error: any) {
        // --- TRATAMENTO DE ERRO BLINDADO (NOVO) ---
        if (error instanceof AppError) {
          // Erros esperados (Auth, Negócio): Podemos mostrar a mensagem
          sendEvent("fatal", {
            error: error.message,
          });
        } else {
          // Erros desconhecidos: Log no servidor, mensagem genérica no cliente
          console.error("🔥 ERRO CRÍTICO NA IMPORTAÇÃO (SSE):", error);
          sendEvent("fatal", {
            error:
              "Ocorreu um erro interno no servidor durante o processamento.",
          });
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
