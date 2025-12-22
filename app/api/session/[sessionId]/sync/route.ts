// app/api/session/[sessionId]/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);
    const { participantId, movements } = await request.json();

    // ------------------------------------------------------------------
    // 0. BLINDAGEM (LOCK) - Verificar se a porta ainda está aberta
    // ------------------------------------------------------------------
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (sessao.status !== "ABERTA") {
      return NextResponse.json(
        { error: "A sessão foi encerrada. Novos envios bloqueados." },
        { status: 409 }
      );
    }

    // --- 1. ESCRITA (WRITE) - Salvar os novos movimentos ---
    if (movements && Array.isArray(movements) && movements.length > 0) {
      await prisma.movimento.createMany({
        data: movements.map((mov: any) => ({
          id_movimento_cliente: mov.id,
          sessao_id: sessionId,
          participante_id: participantId,
          codigo_barras: mov.codigo_barras,
          quantidade: mov.quantidade,
          data_hora: new Date(mov.timestamp),
          // --- ATUALIZAÇÃO AQUI ---
          // Captura o local enviado pelo Frontend (ou define LOJA se não vier nada)
          tipo_local: mov.tipo_local || "LOJA",
          // -----------------------
        })),
        skipDuplicates: true,
      });
    }

    // --- 2. LEITURA (READ) - Buscar os saldos atualizados ---
    // Nota: Para a resposta rápida da sincronização (feedback visual),
    // manteremos a soma total unificada para não quebrar a UI atual do app.
    // A separação detalhada será feita no Relatório Final (Próximo Passo).

    const todosSaldos = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: { sessao_id: sessionId },
      _sum: { quantidade: true },
    });

    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
      select: { codigo_produto: true, codigo_barras: true },
    });

    // --- 3. FORMATAÇÃO DA RESPOSTA ---
    const updatedProducts = todosSaldos.map((saldo) => {
      const prodInfo = produtosSessao.find(
        (p) => p.codigo_barras === saldo.codigo_barras
      );

      const totalDecimal = saldo._sum.quantidade;
      const totalNumero = totalDecimal ? totalDecimal.toNumber() : 0;

      return {
        codigo_barras: saldo.codigo_barras,
        codigo_produto: prodInfo?.codigo_produto || saldo.codigo_barras,
        saldo_contado: totalNumero,
      };
    });

    return NextResponse.json({
      success: true,
      updatedProducts,
    });
  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao processar sincronização." },
      { status: 500 }
    );
  }
}
