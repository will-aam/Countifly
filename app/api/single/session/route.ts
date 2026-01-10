// app/api/single/session/route.ts
/**
 * Rota: GET /api/single/session
 * (Movida de /api/inventory/single/session para evitar conflito com [userId])
 * * Responsabilidade:
 * 1. Garantir/Criar a Sessão Individual (modo INDIVIDUAL).
 * 2. Calcular o saldo atual por código de barras (Snapshot).
 * 3. Retornar tudo para o frontend fazer a "Hidratação" do IndexedDB.
 */
import { NextRequest, NextResponse } from "next/server";
import { ensureSinglePlayerSession } from "@/lib/sessions/single-player";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const usuarioId = payload.userId;

    const { sessaoId, participanteId } = await ensureSinglePlayerSession(
      usuarioId
    );

    // MUDANÇA CRÍTICA: Agrupamos também por 'tipo_local'
    // Isso garante que o banco retorne linhas separadas para Loja e Estoque
    const saldosAgrupados = await prisma.movimento.groupBy({
      by: ["codigo_barras", "tipo_local"],
      where: {
        sessao_id: sessaoId,
      },
      _sum: {
        quantidade: true,
      },
    });

    // O retorno agora inclui o tipo_local
    const snapshot = saldosAgrupados.map((item) => ({
      codigo_de_barras: item.codigo_barras,
      tipo_local: item.tipo_local, // "LOJA" ou "ESTOQUE"
      quantidade: Number(item._sum.quantidade || 0),
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
    console.error("Erro em GET /api/single/session:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "Erro ao sincronizar sessão." },
      { status: 500 }
    );
  }
}
