// app/api/session/[sessionId]/sync/route.ts
/**
 * Rota de API para sincronização de movimentos em uma sessão específica.
 * Responsabilidade:
 * 1. POST: Receber movimentos do participante e salvar no banco.
 * 2. Validar se a sessão está ABERTA antes de aceitar movimentos.
 * 3. Retornar saldos atualizados para feedback visual.
 * Segurança:
 * - Valida status da sessão (ABERTA, ENCERRANDO, FINALIZADA).
 * - Usa skipDuplicates para evitar movimentos duplicados (idempotência).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusSessao } from "@prisma/client"; // ✅ Importa o enum

export async function POST(
  request: Request,
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

    const { participantId, movements } = await request.json();

    // ------------------------------------------------------------------
    // 0. BLINDAGEM (LOCK) - Verificar se a sessão ainda está aberta
    // ------------------------------------------------------------------
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    // ✅ CORREÇÃO: Usa o enum ao invés de string hardcoded
    if (sessao.status !== StatusSessao.ABERTA) {
      return NextResponse.json(
        {
          error: "A sessão foi encerrada. Novos envios bloqueados.",
          statusCode: 409,
          sessionStatus: sessao.status, // ✅ Retorna status atual para o frontend
        },
        { status: 409 },
      );
    }

    // --- 1. VALIDAÇÃO DOS MOVIMENTOS ---
    if (!movements || !Array.isArray(movements) || movements.length === 0) {
      return NextResponse.json(
        { error: "Nenhum movimento válido enviado." },
        { status: 400 },
      );
    }

    // --- 2. ESCRITA (WRITE) - Salvar os novos movimentos ---
    await prisma.movimento.createMany({
      data: movements.map((mov: any) => ({
        id_movimento_cliente: mov.id, // ID único do cliente (UUID)
        sessao_id: sessionId,
        participante_id: participantId,
        codigo_barras: mov.codigo_barras,
        quantidade: mov.quantidade,
        data_hora: new Date(mov.timestamp),
        tipo_local: mov.tipo_local || "LOJA", // "LOJA" ou "ESTOQUE"
      })),
      skipDuplicates: true, // ✅ Evita duplicatas (idempotência)
    });

    // --- 3. LEITURA (READ) - Buscar os saldos atualizados ---
    const todosSaldos = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: { sessao_id: sessionId },
      _sum: { quantidade: true },
    });

    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
      select: { codigo_produto: true, codigo_barras: true },
    });

    // --- 4. FORMATAÇÃO DA RESPOSTA ---
    const updatedProducts = todosSaldos.map((saldo) => {
      const prodInfo = produtosSessao.find(
        (p) => p.codigo_barras === saldo.codigo_barras,
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

    // ✅ Tratamento de erro específico para constraint violations
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Movimento duplicado detectado (já foi processado)." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Erro ao processar sincronização." },
      { status: 500 },
    );
  }
}
