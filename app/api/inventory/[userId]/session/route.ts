// app/api/inventory/[userId]/session/route.ts
/**
 * Rota de API para Gerenciamento de Sessões (Multiplayer).
 * Responsabilidade:
 * 1. POST: Criar uma nova sessão e gerar um código de acesso único.
 * 2. GET: Listar todas as sessões do usuário (Anfitrião).
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { randomInt } from "crypto";

// --- CONSTANTES DE SEGURANÇA ---
const MAX_ACTIVE_SESSIONS = 3;
const MAX_SESSIONS_PER_DAY = 10;
const MAX_RETRIES = 5;

// --- ALTERAÇÃO AQUI: Alfabeto "Human-Friendly" ---
// Removemos: 0, O, I, L, 1 (para evitar confusão visual)
function generateSecureSessionCode(length = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // Sem ambiguidade
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, chars.length);
    result += chars.charAt(randomIndex);
  }
  return result;
}

// --- SESSÃO: POST (Criar Sessão) ---
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    await validateAuth(request, userId);

    // --- Rate Limiting e Quotas (Mantidos) ---
    const activeSessionsCount = await prisma.sessao.count({
      where: { anfitriao_id: userId, status: "ABERTA" },
    });

    if (activeSessionsCount >= MAX_ACTIVE_SESSIONS) {
      return NextResponse.json(
        {
          error: `Limite atingido. Você já tem ${activeSessionsCount} sessões abertas.`,
        },
        { status: 429 }
      );
    }

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const dailySessionsCount = await prisma.sessao.count({
      where: { anfitriao_id: userId, criado_em: { gte: oneDayAgo } },
    });

    if (dailySessionsCount >= MAX_SESSIONS_PER_DAY) {
      return NextResponse.json(
        { error: "Cota diária excedida. Tente novamente amanhã." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const nomeSessao =
      body.nome || `Inventário ${new Date().toLocaleDateString("pt-BR")}`;

    // --- Loop de Criação com Retry (Mantido e Seguro) ---
    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      try {
        const codigo = generateSecureSessionCode(); // Agora usa o alfabeto limpo

        const novaSessao = await prisma.sessao.create({
          data: {
            nome: nomeSessao,
            codigo_acesso: codigo,
            anfitriao_id: userId,
            status: "ABERTA",
          },
        });

        return NextResponse.json(novaSessao, { status: 201 });
      } catch (error: any) {
        if (error.code === "P2002") {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    throw new Error("Não foi possível gerar um código único.");
  } catch (error) {
    return handleApiError(error);
  }
}

// --- GET (Mantido igual, apenas para constar no arquivo) ---
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    await validateAuth(request, userId);

    const sessoes = await prisma.sessao.findMany({
      where: { anfitriao_id: userId },
      orderBy: { criado_em: "desc" },
      include: {
        participantes: {
          where: { status: "ATIVO" },
          select: { id: true },
        },
        _count: { select: { produtos: true, movimentos: true } },
      },
    });

    const sessoesFormatadas = sessoes.map((s) => ({
      ...s,
      participantes: undefined,
      _count: {
        ...s._count,
        participantes: s.participantes.length,
      },
    }));

    return NextResponse.json(sessoesFormatadas);
  } catch (error) {
    return handleApiError(error);
  }
}
