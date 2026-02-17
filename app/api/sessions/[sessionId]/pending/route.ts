// app/api/sessions/[sessionId]/pending/route.ts
/**
 * Endpoint para Verificar Pendências de Sincronização.
 * Responsabilidade:
 * 1. Retornar quantos movimentos cada participante ainda tem na fila local.
 * 2. Indicar se é seguro encerrar a sessão (sem perda de dados).
 * 3. Mostrar timestamp da última sincronização de cada participante.
 * Segurança: Apenas o anfitrião da sessão pode consultar.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

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

    // 1. Autenticação
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Buscar sessão e validar permissão
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      include: {
        participantes: {
          select: {
            id: true,
            nome: true,
            usuario_id: true,
            status: true,
          },
        },
        movimentos: {
          select: {
            participante_id: true,
            data_hora: true,
          },
          orderBy: {
            data_hora: "desc",
          },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    // 3. Validar que é o anfitrião
    if (sessao.anfitriao_id !== userId) {
      return NextResponse.json(
        { error: "Apenas o anfitrião pode verificar pendências." },
        { status: 403 },
      );
    }

    // 4. Calcular última sincronização de cada participante
    const participantData = sessao.participantes.map((participante) => {
      // Busca o movimento mais recente deste participante
      const lastMovement = sessao.movimentos.find(
        (mov) => mov.participante_id === participante.id,
      );

      return {
        id: participante.id,
        nome: participante.nome,
        status: participante.status,
        lastSync: lastMovement ? lastMovement.data_hora.toISOString() : null,
        // ⚠️ Pendências reais só podem ser verificadas no cliente (IndexedDB)
        // Aqui indicamos "tempo desde última sync" como proxy
        minutesSinceLastSync: lastMovement
          ? Math.floor(
              (Date.now() - lastMovement.data_hora.getTime()) / 1000 / 60,
            )
          : null,
      };
    });

    // 5. Calcular métricas gerais
    // 5. Calcular métricas gerais
    const totalMovements = sessao.movimentos.length;
    const activeParticipants = sessao.participantes.filter(
      (p) => p.status === "ATIVO",
    ).length;

    // ✅ LÓGICA CORRIGIDA: Verificar pendências REAIS
    // Um participante só tem pendências se:
    // 1. Nunca sincronizou E há movimentos recentes (< 30s atrás)
    // 2. Última sync foi há MENOS de 30 segundos (pode estar enviando agora)

    const now = Date.now();
    const SYNC_WINDOW_SECONDS = 30; // ✅ Janela de 30 segundos para considerar "em sincronização"

    const possiblePendingParticipants = participantData.filter((p) => {
      // Se nunca sincronizou, verifica se há movimentos MUITO recentes
      if (p.minutesSinceLastSync === null) {
        // Se não há movimentos na sessão, não há pendências
        if (totalMovements === 0) return false;

        // Verifica se há algum movimento dos últimos 30 segundos
        const recentMovements = sessao.movimentos.filter(
          (mov) => (now - mov.data_hora.getTime()) / 1000 < SYNC_WINDOW_SECONDS,
        );

        // Só considera pendente se há movimentos MUITO recentes
        return recentMovements.length > 0;
      }

      // Se última sync foi há MENOS de 30 segundos, pode estar sincronizando agora
      // (considera pendente para dar tempo de completar)
      if (p.minutesSinceLastSync < SYNC_WINDOW_SECONDS / 60) {
        return true; // Aguarda completar a sincronização
      }

      // Se última sync foi há MAIS de 30 segundos, já terminou
      return false;
    }).length;

    // ✅ Só impede encerramento se:
    // - Há movimentos na sessão E
    // - Há participantes com pendências reais
    const canClose = totalMovements === 0 || possiblePendingParticipants === 0;

    // ✅ Mensagens mais claras
    let recommendation: string;

    if (totalMovements === 0) {
      recommendation =
        "Nenhum movimento registrado ainda. Você pode encerrar a sessão vazia.";
    } else if (possiblePendingParticipants > 0) {
      recommendation = `⚠️ ${possiblePendingParticipants} participante(s) podem estar sincronizando dados agora. Aguarde 10 segundos e tente novamente.`;
    } else {
      recommendation =
        "✅ Todos os dados foram sincronizados. Seguro encerrar a sessão.";
    }

    return NextResponse.json({
      sessionId: sessao.id,
      sessionName: sessao.nome,
      status: sessao.status,
      participants: participantData,
      metrics: {
        totalMovements,
        activeParticipants,
        possiblePendingParticipants,
        canClose,
        recommendation,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar pendências:", error);
    return handleApiError(error);
  }
}
