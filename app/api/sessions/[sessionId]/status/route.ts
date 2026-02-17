// app/api/sessions/[sessionId]/status/route.ts
/**
 * Endpoint para Verificar Status de uma Sessão.
 * Usado pelos colaboradores para detectar se a sessão foi encerrada.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    // Buscar sessão
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        nome: true,
        status: true,
        codigo_acesso: true,
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    // ✅ Se a sessão foi encerrada, retorna 409
    if (sessao.status === "FINALIZADA" || sessao.status === "ENCERRANDO") {
      return NextResponse.json(
        {
          error: "Sessão encerrada.",
          status: sessao.status,
        },
        { status: 409 },
      );
    }

    // ✅ Sessão ainda está aberta
    return NextResponse.json({
      id: sessao.id,
      nome: sessao.nome,
      status: sessao.status,
      codigo: sessao.codigo_acesso,
    });
  } catch (error) {
    console.error("Erro ao verificar status da sessão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
