// app/api/inventory/import/route.ts
/**
 * Rota de API para importação de produtos (Single Player) - VERSÃO SEGURA (SEM ID NA URL) 🛡️
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
import { Prisma } from "@prisma/client";
import { getAuthPayload, AppError } from "@/lib/auth"; // Mudança: getAuthPayload

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 10000;
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

function parseStockValue(value: string): number {
  if (!value) return 0;
  const clean = value.trim();
  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  if (hasComma && !hasDot) return parseFloat(clean.replace(",", "."));
  if (!hasComma && hasDot) return parseFloat(clean);
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
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, payload: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        );
      };

      try {
        // 1. Identificar usuário pelo Token (Segurança)
        const payload = await getAuthPayload();
        const userId = payload.userId;

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
          sendEvent("fatal", { error: `Arquivo muito grande. Limite: 10MB.` });
          controller.close();
          return;
        }

        const csvText = await file.text();
        const parseResult = Papa.parse<CsvRow>(csvText, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

        if (parseResult.errors.length > 0 && parseResult.errors.length > 10) {
          sendEvent("fatal", {
            error: "Arquivo CSV corrompido ou formato inválido.",
            details: parseResult.errors.slice(0, 5),
          });
          controller.close();
          return;
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

          if (codProduto) {
            if (seenProductCodes.has(codProduto)) {
              rowErrors.push(`Código do Produto repetido neste arquivo`);
            } else {
              seenProductCodes.set(codProduto, rowNumber);
            }
          }

          if (codBarras) {
            if (seenBarcodes.has(codBarras)) {
              rowErrors.push(`Código de Barras repetido neste arquivo`);
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
            continue;
          }

          try {
            await prisma.$transaction(async (tx) => {
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
                produto = await tx.produto.create({
                  data: {
                    codigo_produto: codProduto!,
                    descricao: descricao || "Sem descrição",
                    saldo_estoque: saldoNumerico,
                    usuario_id: userId,
                  },
                });
              } else {
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

              await tx.codigoBarras.upsert({
                where: {
                  codigo_de_barras_usuario_id: {
                    codigo_de_barras: codBarras!,
                    usuario_id: userId,
                  },
                },
                update: { produto_id: produto.id },
                create: {
                  codigo_de_barras: codBarras!,
                  produto_id: produto.id,
                  usuario_id: userId,
                },
              });

              await tx.codigoBarras.deleteMany({
                where: {
                  produto_id: produto.id,
                  usuario_id: userId,
                  NOT: { codigo_de_barras: codBarras! },
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
                message: "Código já existe.",
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
          sendEvent("fatal", { error: error.message });
        } else {
          console.error("🔥 ERRO CRÍTICO NA IMPORTAÇÃO (SSE):", error);
          sendEvent("fatal", { error: "Erro interno no servidor." });
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
