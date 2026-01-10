// app/api/inventory/single/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureSinglePlayerSession } from "@/lib/sessions/single-player";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Garante que a rota seja executada a cada requisição (sem cache estático)
export const dynamic = "force-dynamic";

/**
 * Rota: GET /api/inventory/single/session
 * * Responsabilidade:
 * 1. Garantir/Criar a Sessão Individual (modo INDIVIDUAL).
 * 2. Calcular o saldo atual por código de barras (Snapshot).
 * 3. Retornar tudo para o frontend fazer a "Hidratação" do IndexedDB.
 */
export async function GET(_request: NextRequest) {
  try {
    // 1) Descobre o usuário logado a partir do JWT
    const payload = await getAuthPayload();
    const usuarioId = payload.userId;

    // 2) Garante a sessão individual + participante
    const { sessaoId, participanteId } = await ensureSinglePlayerSession(
      usuarioId
    );

    // 3) Agrupa e soma os movimentos dessa sessão
    // Isso gera o "Saldo Atual" baseado em tudo que já foi bipado (PC + Celular)
    const saldosAgrupados = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: {
        sessao_id: sessaoId,
      },
      _sum: {
        quantidade: true,
      },
    });

    // 4) Formata para um snapshot compatível com a interface do Frontend
    const snapshot = saldosAgrupados.map((item) => ({
      codigo_de_barras: item.codigo_barras,
      quantidade: Number(item._sum.quantidade || 0), // Converte Decimal para Number
    }));

    return NextResponse.json(
      {
        success: true,
        sessaoId,
        participanteId,
        snapshot,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erro em GET /api/inventory/single/session:",
      error?.message || error
    );
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao sincronizar sessão individual.",
      },
      { status: 500 }
    );
  }
}
