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
import { randomInt } from "crypto"; // Usando crypto para geração segura

// --- CONSTANTES DE SEGURANÇA ---
const MAX_ACTIVE_SESSIONS = 3;
const MAX_SESSIONS_PER_DAY = 10;
const MAX_RETRIES = 5; // Limite de tentativas para colisão de código

// Função utilitária segura para gerar códigos (ex: "A1B2C3")
function generateSecureSessionCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    // randomInt é criptograficamente seguro e exclusivo do limite superior
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
      return NextResponse.json(
        { error: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    // 1. Segurança: Validação de Auth
    await validateAuth(request, userId);

    // ----------------------------------------------------------------
    // 🛡️ BLINDAGEM DE SEGURANÇA (RATE LIMITING & QUOTAS)
    // ----------------------------------------------------------------

    // Verifica Quantidade de Sessões ABERTAS
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

    // Verifica Criações nas últimas 24h
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

    // ----------------------------------------------------------------
    // 🎲 CRIAÇÃO COM RETRY E TRATAMENTO DE COLISÃO (P2002)
    // ----------------------------------------------------------------
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        // Tenta gerar e inserir diretamente (Atomicidade garantida pelo banco)
        const codigo = generateSecureSessionCode();

        const novaSessao = await prisma.sessao.create({
          data: {
            nome: nomeSessao,
            codigo_acesso: codigo,
            anfitriao_id: userId,
            status: "ABERTA",
          },
        });

        // Se chegou aqui, sucesso! Retorna a sessão.
        return NextResponse.json(novaSessao, { status: 201 });
      } catch (error: any) {
        // Se for erro de violação de unicidade (P2002) no campo codigo_acesso, tentamos de novo
        if (error.code === "P2002") {
          // Prisma Unique Constraint Violation
          attempts++;
          console.warn(
            `Colisão de código detectada. Tentativa ${attempts}/${MAX_RETRIES}`
          );
          continue; // Volta para o início do while
        }

        // Se for qualquer outro erro, estoura para o catch global
        throw error;
      }
    }

    // Se esgotou as tentativas
    throw new Error(
      "Não foi possível gerar um código único após várias tentativas."
    );
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
        // TRUQUE: Trazemos o array filtrado de participantes ativos
        participantes: {
          where: { status: "ATIVO" },
          select: { id: true }, // Só precisamos do ID para contar, otimiza a query
        },
        // Mantemos os contadores nativos para o resto
        _count: {
          select: { produtos: true, movimentos: true },
        },
      },
    });

    // Mapeamos para o formato que o Frontend espera (mantendo a interface SessaoData)
    const sessoesFormatadas = sessoes.map((s) => ({
      ...s,
      participantes: undefined, // Removemos o array cru para limpar o JSON
      _count: {
        ...s._count,
        // Sobrescrevemos a contagem com o tamanho do array filtrado
        participantes: s.participantes.length,
      },
    }));

    return NextResponse.json(sessoesFormatadas);
  } catch (error) {
    return handleApiError(error);
  }
}
