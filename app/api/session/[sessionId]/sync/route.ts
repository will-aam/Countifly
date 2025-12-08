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
      select: { status: true }, // Só precisamos saber o status
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 }
      );
    }

    if (sessao.status !== "ABERTA") {
      // Se o status for FINALIZADA (ou qualquer outro), rejeitamos a escrita.
      // Isso impede a Race Condition de dados entrando durante o fechamento.
      return NextResponse.json(
        { error: "A sessão foi encerrada. Novos envios bloqueados." },
        { status: 409 } // 409 Conflict é semanticamente correto aqui
      );
    }
    // ------------------------------------------------------------------

    // --- 1. ESCRITA (WRITE) - Salvar os novos movimentos ---
    // O Prisma converte automaticamente o número do frontend (mov.quantidade)
    // para o tipo Decimal do banco de dados na escrita.
    if (movements && Array.isArray(movements) && movements.length > 0) {
      await prisma.movimento.createMany({
        data: movements.map((mov: any) => ({
          id_movimento_cliente: mov.id,
          sessao_id: sessionId,
          participante_id: participantId,
          codigo_barras: mov.codigo_barras,
          quantidade: mov.quantidade, // Conversão automática: number -> Decimal
          data_hora: new Date(mov.timestamp),
        })),
        skipDuplicates: true, // Proteção contra duplicidade (Idempotência)
      });
    }

    // --- 2. LEITURA (READ) - Buscar os saldos atualizados de TODOS os itens ---
    // O Prisma retorna a soma (_sum.quantidade) como um objeto Decimal.
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
    // É CRUCIAL converter o objeto Decimal para um número JavaScript puro
    // antes de enviar a resposta para o frontend, evitando problemas de serialização.
    const updatedProducts = todosSaldos.map((saldo) => {
      const prodInfo = produtosSessao.find(
        (p) => p.codigo_barras === saldo.codigo_barras
      );

      // --- PONTO CHAVE DA CORREÇÃO ---
      // Convertemos o objeto Decimal do Prisma para número JavaScript puro.
      const totalDecimal = saldo._sum.quantidade;
      const totalNumero = totalDecimal ? totalDecimal.toNumber() : 0;
      // -----------------------------

      return {
        codigo_barras: saldo.codigo_barras,
        codigo_produto: prodInfo?.codigo_produto || saldo.codigo_barras,
        saldo_contado: totalNumero, // Envia número limpo para o frontend
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
