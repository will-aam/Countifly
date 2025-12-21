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
import { handleApiError } from "@/lib/api"; // Importamos o Handler Central

// --- CONSTANTES DE SEGURANÇA ---
const MAX_ACTIVE_SESSIONS = 3; // Ninguém precisa de mais de 3 inventários abertos ao mesmo tempo
const MAX_SESSIONS_PER_DAY = 10; // Cota diária para evitar spam de histórico

// Função utilitária para gerar códigos curtos e fáceis (ex: "A1B2C3")
function generateSessionCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
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
      return NextResponse.json(
        { error: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    // 1. Segurança: Apenas o dono da conta pode criar sessões
    await validateAuth(request, userId);

    // ----------------------------------------------------------------
    // 🛡️ BLINDAGEM DE SEGURANÇA (RATE LIMITING & QUOTAS)
    // ----------------------------------------------------------------

    // 1. Verifica Quantidade de Sessões ABERTAS (Concorrência)
    const activeSessionsCount = await prisma.sessao.count({
      where: {
        anfitriao_id: userId,
        status: "ABERTA",
      },
    });

    if (activeSessionsCount >= MAX_ACTIVE_SESSIONS) {
      return NextResponse.json(
        {
          error: `Limite atingido. Você já tem ${activeSessionsCount} sessões abertas. Finalize uma antes de criar outra.`,
        },
        { status: 429 } // Too Many Requests
      );
    }

    // 2. Verifica Criações nas últimas 24h (Spam Diário)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const dailySessionsCount = await prisma.sessao.count({
      where: {
        anfitriao_id: userId,
        criado_em: { gte: oneDayAgo },
      },
    });

    if (dailySessionsCount >= MAX_SESSIONS_PER_DAY) {
      return NextResponse.json(
        {
          error: "Cota diária excedida. Tente novamente amanhã.",
        },
        { status: 429 }
      );
    }
    // ----------------------------------------------------------------

    const body = await request.json();
    // Se não vier nome, usamos a data atual como padrão
    const nomeSessao =
      body.nome || `Inventário ${new Date().toLocaleDateString("pt-BR")}`;

    // 2. Gerar código único (com verificação de colisão)
    let codigo = generateSessionCode();
    let exists = await prisma.sessao.findUnique({
      where: { codigo_acesso: codigo },
    });

    while (exists) {
      codigo = generateSessionCode();
      exists = await prisma.sessao.findUnique({
        where: { codigo_acesso: codigo },
      });
    }

    // 3. Criar a Sessão no Banco
    const novaSessao = await prisma.sessao.create({
      data: {
        nome: nomeSessao,
        codigo_acesso: codigo,
        anfitriao_id: userId,
        status: "ABERTA",
      },
    });

    return NextResponse.json(novaSessao, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// --- SESSÃO: GET (Listar Sessões) ---
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
        _count: {
          select: { participantes: true, produtos: true, movimentos: true },
        },
      },
    });

    return NextResponse.json(sessoes);
  } catch (error) {
    return handleApiError(error);
  }
}
