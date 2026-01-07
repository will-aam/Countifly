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
 *
 * Ajuste de regra:
 * - Quando um produto já existe, o saldo_estoque passa a ser SOMADO ao valor atual,
 *   em vez de simplesmente sobrescrito.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
import { Prisma } from "@prisma/client";
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

// ✅ Função inteligente para parse de valores numéricos
function parseStockValue(value: string): number {
  if (!value) return 0;

  const clean = value.trim();

  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  if (hasComma && !hasDot) {
    // "1,567" -> BR
    return parseFloat(clean.replace(",", "."));
  }

  if (!hasComma && hasDot) {
    // "1.567" -> US
    return parseFloat(clean);
  }

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");

    if (lastComma > lastDot) {
      // BR: 1.500,50
      return parseFloat(clean.replace(/\./g, "").replace(",", "."));
    } else {
      // US: 1,500.50
      return parseFloat(clean.replace(/,/g, ""));
    }
  }

  return parseFloat(clean);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = parseInt(params.userId, 10);
  const encoder = new TextEncoder();

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

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, payload: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        );
      };

      try {
        await validateAuth(request, userId);

        const formData = await request.formData();
        const file = formData.get("file") as File;

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

        const csvText = await file.text();
        const parseResult = Papa.parse<CsvRow>(csvText, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

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

        const totalRows = parseResult.data.length;
        if (totalRows > MAX_ROWS) {
          sendEvent("fatal", {
            error: `Limite excedido. Máximo de ${MAX_ROWS} linhas permitidas.`,
          });
          controller.close();
          return;
        }

        sendEvent("start", { total: totalRows });

        let importedCount = 0;
        let errorCount = 0;
        let conflictCount = 0;

        const seenProductCodes = new Map<string, number>();
        const seenBarcodes = new Map<string, number>();

        // Loop linha a linha
        for (const [index, row] of parseResult.data.entries()) {
          const rowNumber = index + 2;

          const saldoNumerico = parseStockValue(row.saldo_estoque);
          const codProduto = row.codigo_produto?.trim();
          const codBarras = row.codigo_de_barras?.trim();
          const descricao = row.descricao?.trim();

          const rowErrors: string[] = [];
          if (!codProduto) rowErrors.push("Código do Produto vazio");
          if (!codBarras) rowErrors.push("Código de Barras vazio");
          if (isNaN(saldoNumerico)) rowErrors.push("Saldo inválido");

          // Duplicidade interna no arquivo
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

          try {
            await prisma.$transaction(async (tx) => {
              // 1. Produto: agora SOMANDO saldo_estoque quando já existe
              const existing = await tx.produto.findUnique({
                where: {
                  codigo_produto_usuario_id: {
                    codigo_produto: codProduto!,
                    usuario_id: userId,
                  },
                },
              });

              let produto;

              if (!existing) {
                // Produto novo
                produto = await tx.produto.create({
                  data: {
                    codigo_produto: codProduto!,
                    descricao: descricao || "Sem descrição",
                    saldo_estoque: saldoNumerico,
                    usuario_id: userId,
                  },
                });
              } else {
                // Produto existente: SOMA o saldo
                const novoSaldo =
                  Number(existing.saldo_estoque ?? 0) + saldoNumerico;

                produto = await tx.produto.update({
                  where: {
                    codigo_produto_usuario_id: {
                      codigo_produto: codProduto!,
                      usuario_id: userId,
                    },
                  },
                  data: {
                    descricao: descricao || existing.descricao,
                    saldo_estoque: novoSaldo,
                  },
                });
              }

              // 2. Código de Barras (mantém upsert)
              await tx.codigoBarras.upsert({
                where: {
                  codigo_de_barras_usuario_id: {
                    codigo_de_barras: codBarras!,
                    usuario_id: userId,
                  },
                },
                update: {
                  produto_id: produto.id,
                },
                create: {
                  codigo_de_barras: codBarras!,
                  produto_id: produto.id,
                  usuario_id: userId,
                },
              });

              // 3. Limpeza de códigos de barras órfãos do mesmo produto
              await tx.codigoBarras.deleteMany({
                where: {
                  produto_id: produto.id,
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

        sendEvent("complete", {
          imported: importedCount,
          errors: errorCount,
          conflicts: conflictCount,
          total: totalRows,
        });
      } catch (error: any) {
        if (error instanceof AppError) {
          sendEvent("fatal", {
            error: error.message,
          });
        } else {
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
