// app/api/session/[sessionId]/participant/[participantId]/leave/route.ts
/**
 * Rota de API para permitir que um participante saia de uma sessão.
 * Responsabilidade:
 * 1. PATCH: Atualizar o status do participante para "FINALIZADO".
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { sessionId: string; participantId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);
    const participantId = parseInt(params.participantId, 10);

    // 1. Atualiza o status para FINALIZADO
    await prisma.participante.updateMany({
      where: {
        id: participantId,
        sessao_id: sessionId,
        status: "ATIVO", // Só finaliza quem está ativo
      },
      data: {
        status: "FINALIZADO",
        // Se você tiver um campo 'saiu_em' no schema, use: saiu_em: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao finalizar participação:", error);
    return NextResponse.json(
      { error: "Erro ao processar saída." },
      { status: 500 }
    );
  }
}
