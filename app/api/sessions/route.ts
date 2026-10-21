// app/api/sessions/route.ts
/**
 * Rota de API para Gerenciamento de Sessões (Multiplayer).
 * Responsabilidade:
 * 1. POST: Criar uma nova sessão (Força modo MULTIPLAYER).
 * 2. GET: Listar apenas sessões MULTIPLAYER (Ignora as sessões 'INDIVIDUAL' automáticas).
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { randomInt } from "crypto";

export const dynamic = "force-dynamic";

// --- CONSTANTES ---
const MAX_ACTIVE_SESSIONS = 3;
const MAX_SESSIONS_PER_DAY = 10;
const MAX_RETRIES = 5;

function generateSecureSessionCode(length = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, chars.length);
    result += chars.charAt(randomIndex);
  }
  return result;
}

// --- POST (Criar Sessão) ---
export async function POST(request: NextRequest) {
  try {
    // 1. Identificar Usuário (Token)
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Rate Limiting (Apenas para sessões MULTIPLAYER)
    const activeSessionsCount = await prisma.sessao.count({
      where: {
        anfitriao_id: userId,
        status: "ABERTA",
        modo: "MULTIPLAYER", // <--- Importante filtrar aqui também para não contar a individual
      },
    });

    if (activeSessionsCount >= MAX_ACTIVE_SESSIONS) {
      return NextResponse.json(
        {
          error: `Limite atingido. Você já tem ${activeSessionsCount} sessões de equipe abertas.`,
        },
        { status: 429 }
      );
    }

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const dailySessionsCount = await prisma.sessao.count({
      where: {
        anfitriao_id: userId,
        criado_em: { gte: oneDayAgo },
        modo: "MULTIPLAYER",
      },
    });

    if (dailySessionsCount >= MAX_SESSIONS_PER_DAY) {
      return NextResponse.json(
        { error: "Cota diária de sessões excedida. Tente novamente amanhã." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const nomeSessao =
      body.nome || `Inventário ${new Date().toLocaleDateString("pt-BR")}`;
    const empresaId = body.empresa_id == null ? null : Number(body.empresa_id);

    if (body.empresa_id != null) {
      if (empresaId === null || !Number.isInteger(empresaId) || empresaId <= 0) {
        return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
      }
      const empresa = await prisma.empresa.findFirst({
        where: { id: empresaId, usuario_id: userId, ativo: true },
        select: { id: true },
      });
      if (!empresa) {
        return NextResponse.json(
          { error: "Empresa inválida, inativa ou não pertence ao usuário." },
          { status: 400 },
        );
      }
    }

    // 3. Criação com Retry
    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      try {
        const codigo = generateSecureSessionCode();

        const novaSessao = await prisma.sessao.create({
          data: {
            nome: nomeSessao,
            codigo_acesso: codigo,
            anfitriao_id: userId,
            status: "ABERTA",
            modo: "MULTIPLAYER", // Força multiplayer
            empresa_id: empresaId,
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

// --- GET (Listar Minhas Sessões) ---
export async function GET(request: NextRequest) {
  try {
    // 1. Identificar Usuário
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Buscar no Banco (APENAS MULTIPLAYER)
    const sessoes = await prisma.sessao.findMany({
      where: {
        anfitriao_id: userId,
        modo: "MULTIPLAYER", // <--- A CORREÇÃO MÁGICA ESTÁ AQUI 🪄
      },
      orderBy: { criado_em: "desc" },
      include: {
        participantes: {
          where: { status: "ATIVO" },
          select: { id: true },
        },
        _count: { select: { produtos: true, movimentos: true } },
      },
    });

    // 3. Formatar Retorno
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
