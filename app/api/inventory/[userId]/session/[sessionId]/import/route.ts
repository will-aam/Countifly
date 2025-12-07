// app/api/inventory/[userId]/session/[sessionId]/import/route.ts

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as Papa from "papaparse";
import { Prisma } from "@prisma/client";
import { validateAuth, createSseErrorResponse } from "@/lib/auth";

// --- LIMITES DE SEGURANÇA ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (Suporta aprox 50k+ produtos)
const MAX_ROWS = 20000; // Limite seguro para evitar Timeout em processamento linha-a-linha
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
  const encoder = new TextEncoder();

  if (isNaN(userId)) {
    return new Response(
      `data: ${JSON.stringify({ error: "ID de usuário inválido." })}\n\n`,
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
        // 1. Autenticação
        await validateAuth(request, userId);

        // 2. Verificar Sessão
        const paramsSessionId = parseInt(params.sessionId, 10);
        const sessao = await prisma.sessao.findUnique({
          where: { id: paramsSessionId },
        });

        if (!sessao || sessao.anfitriao_id !== userId) {
          throw new Error("Sessão não encontrada ou acesso negado.");
        }

        // 3. Processar Upload com BLINDAGEM
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

        // [SEGURANÇA] Verificação Antecipada de Tamanho (DoS de Memória)
        if (file.size > MAX_FILE_SIZE) {
          createSseErrorResponse(
            controller,
            encoder,
            `Arquivo muito grande. O limite é de 5MB (aprox. ${MAX_ROWS} produtos).`,
            413 // Payload Too Large
          );
          return;
        }

        // [SEGURANÇA] Verificação Básica de Tipo
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

        // 4. Parsing
        const parseResult = Papa.parse<CsvRow>(csvText, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

        if (parseResult.errors.length > 0) {
          // Se tiver muitos erros, aborta logo
          if (parseResult.errors.length > 10) {
            createSseErrorResponse(
              controller,
              encoder,
              "O arquivo contém muitos erros de formatação.",
              400
            );
            return;
          }
        }

        // [SEGURANÇA] Validação de Colunas (Evita processar arquivos errados)
        const headers = parseResult.meta.fields || [];
        const missingHeaders = EXPECTED_HEADERS.filter(
          (h) => !headers.includes(h)
        );

        if (missingHeaders.length > 0) {
          createSseErrorResponse(
            controller,
            encoder,
            `Colunas obrigatórias faltando: ${missingHeaders.join(
              ", "
            )}. Verifique o template.`,
            400
          );
          return;
        }

        const totalRows = parseResult.data.length;

        // [SEGURANÇA] Limite de Linhas (DoS de CPU/Tempo)
        if (totalRows > MAX_ROWS) {
          createSseErrorResponse(
            controller,
            encoder,
            `O arquivo excede o limite de ${MAX_ROWS} produtos. Divida em arquivos menores.`,
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

        // 5. Loop de Inserção
        for (const [index, row] of parseResult.data.entries()) {
          // ✅ Usando a função corrigida para parse de valores numéricos
          const saldoNumerico = parseStockValue(row.saldo_estoque);

          if (isNaN(saldoNumerico) || !row.codigo_produto) {
            errorCount++;
            continue;
          }

          try {
            const codBarras = row.codigo_de_barras?.trim() || null;

            await prisma.produtoSessao.upsert({
              where: {
                sessao_id_codigo_produto: {
                  sessao_id: paramsSessionId,
                  codigo_produto: row.codigo_produto.trim(),
                },
              },
              update: {
                descricao: row.descricao?.trim(),
                saldo_sistema: saldoNumerico, // Decimal correto
                codigo_barras: codBarras,
              },
              create: {
                sessao_id: paramsSessionId,
                codigo_produto: row.codigo_produto.trim(),
                descricao: row.descricao?.trim() || "Sem descrição",
                saldo_sistema: saldoNumerico, // Decimal correto
                codigo_barras: codBarras,
              },
            });

            importedCount++;
          } catch (error) {
            console.error(`Erro linha ${index}:`, error);
            errorCount++;
          }

          // Progresso a cada 50 itens (reduz tráfego de rede vs a cada 10)
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
          }
        }

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
        if (
          error.message.includes("Acesso não autorizado") ||
          error.message.includes("Acesso negado")
        ) {
          const status = error.message.includes("negado") ? 403 : 401;
          createSseErrorResponse(controller, encoder, error.message, status);
        } else {
          console.error("Erro na importação:", error);
          createSseErrorResponse(
            controller,
            encoder,
            "Erro interno ao processar arquivo.",
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
