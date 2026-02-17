// app/api/sessions/[sessionId]/end/route.ts
/**
 * Rota para Encerrar uma Sessão de Contagem (Com Transação Segura).
 * Responsabilidade:
 * 1. Validar permissões e status da sessão.
 * 2. Mudar status para ENCERRANDO (lock temporário).
 * 3. Aguardar sincronização de movimentos pendentes.
 * 4. Calcular inventário final dentro de transação.
 * 5. Mudar status para FINALIZADA.
 * 6. Salvar relatório no histórico.
 * Segurança: Validação via Token JWT + Transação ACID.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { StatusSessao } from "@prisma/client"; // ✅ Importa enum
import * as Papa from "papaparse";
import { handleApiError } from "@/lib/api";

// Helper para converter Decimal para Number
const toNum = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

export async function POST(
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

    // 1. Segurança via Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // ============================================================
    // 2. TRANSAÇÃO ATÔMICA: Garante consistência dos dados
    // ============================================================
    const resultado = await prisma.$transaction(
      async (tx) => {
        // 2.1. Buscar e Validar Sessão
        const sessao = await tx.sessao.findUnique({
          where: { id: sessionId },
        });

        if (!sessao || sessao.anfitriao_id !== userId) {
          throw new Error("Sessão não encontrada ou acesso negado.");
        }

        // ✅ Usa enum para validação type-safe
        if (sessao.status === StatusSessao.FINALIZADA) {
          throw new Error("Esta sessão já foi finalizada.");
        }

        if (sessao.status === StatusSessao.ENCERRANDO) {
          throw new Error("Esta sessão já está sendo encerrada.");
        }

        // 2.2. Marcar como ENCERRANDO (Lock temporário)
        await tx.sessao.update({
          where: { id: sessionId },
          data: { status: StatusSessao.ENCERRANDO },
        });

        console.log(
          `[Sessão ${sessionId}] Status: ENCERRANDO (aguardando sync...)`,
        );

        // 2.3. Aguardar 5 segundos para sync final
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 2.4. Coletar Dados (Snapshot dentro da transação)
        const produtosSessao = await tx.produtoSessao.findMany({
          where: { sessao_id: sessionId },
        });

        const contagens = await tx.movimento.groupBy({
          by: ["codigo_barras"],
          where: { sessao_id: sessionId },
          _sum: { quantidade: true },
        });

        // 2.5. Cruzamento de Dados
        const mapaContagem = new Map<string, number>();
        contagens.forEach((c) => {
          if (c.codigo_barras) {
            mapaContagem.set(c.codigo_barras, toNum(c._sum.quantidade));
          }
        });

        const relatorioFinal = produtosSessao.map((prod) => {
          const codigo = prod.codigo_barras || prod.codigo_produto;
          const qtdContada = mapaContagem.get(codigo) || 0;
          const saldoSistemaNum = toNum(prod.saldo_sistema);
          const diferenca = qtdContada - saldoSistemaNum;

          // Remove do mapa após processar
          if (codigo) mapaContagem.delete(codigo);

          return {
            codigo_barras: codigo,
            codigo_produto: prod.codigo_produto,
            descricao: prod.descricao,
            saldo_sistema: saldoSistemaNum,
            contagem: qtdContada,
            diferenca: diferenca,
          };
        });

        // 2.6. Processar Itens Sobras (Não cadastrados)
        for (const [codigo, qtd] of mapaContagem.entries()) {
          relatorioFinal.push({
            codigo_barras: codigo,
            codigo_produto: "DESCONHECIDO",
            descricao: `Item não cadastrado (${codigo})`,
            saldo_sistema: 0,
            contagem: qtd,
            diferenca: qtd,
          });
        }

        // 2.7. Marcar como FINALIZADA (Lock permanente)
        await tx.sessao.update({
          where: { id: sessionId },
          data: {
            status: StatusSessao.FINALIZADA,
            finalizado_em: new Date(),
          },
        });

        console.log(`[Sessão ${sessionId}] Status: FINALIZADA`);

        return { sessao, relatorioFinal };
      },
      {
        maxWait: 20000, // Aguarda até 20s para obter lock
        timeout: 30000, // Timeout total de 30s
      },
    );

    // ============================================================
    // 3. SALVAR HISTÓRICO (Fora da transação para não travar)
    // ============================================================
    const csvContent = Papa.unparse(resultado.relatorioFinal, {
      header: true,
      delimiter: ";",
    });

    const nomeArquivo = `${resultado.sessao.nome.replace(/\s+/g, "_")}_FINAL.csv`;

    await prisma.contagemSalva.create({
      data: {
        usuario_id: userId,
        nome_arquivo: nomeArquivo,
        conteudo_csv: csvContent,
        empresa_id: resultado.sessao.empresa_id, // ✅ Vincula empresa (se houver)
      },
    });

    console.log(`[Sessão ${sessionId}] Relatório salvo: ${nomeArquivo}`);

    return NextResponse.json({
      success: true,
      message: "Sessão encerrada e relatório salvo no histórico.",
      fileName: nomeArquivo,
    });
  } catch (error: any) {
    console.error("Erro ao encerrar sessão:", error);

    // ✅ Rollback automático da transação em caso de erro
    // (Prisma reverte automaticamente se a transaction falhar)

    return handleApiError(error);
  }
}
