// app/api/session/join/route.ts
/**
 * Rota pública para entrada em sessões colaborativas.
 * Responsabilidade:
 * 1. Validar código de acesso e nome do participante.
 * 2. Verificar se a sessão existe e está aberta.
 * 3. Criar/reativar participante.
 * 4. ✅ RATE LIMITING: 10 tentativas/5min por IP.
 * Segurança:
 * - Validação estrita de charset (alfanumérico)
 * - Rate limiting por IP unificado
 * - Tarpit (2s) para códigos inválidos
 * - Proteção contra criação massiva
 * - Logs de tentativas suspeitas
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// ✅ CONFIGURAÇÕES DE SEGURANÇA
const MAX_PARTICIPANTS_PER_SESSION = 10;
const MAX_CODE_LENGTH = 10;
const MAX_NAME_LENGTH = 30;
const TARPIT_DELAY_MS = 2000; // 2 segundos

// ✅ SCHEMA DE VALIDAÇÃO COM ZOD
const JoinSessionSchema = z.object({
  code: z
    .string()
    .min(3, "Código deve ter no mínimo 3 caracteres")
    .max(
      MAX_CODE_LENGTH,
      `Código deve ter no máximo ${MAX_CODE_LENGTH} caracteres`,
    )
    .regex(/^[A-Z0-9]+$/, "Código deve conter apenas letras e números")
    .transform((val) => val.toUpperCase().trim()),
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(
      MAX_NAME_LENGTH,
      `Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`,
    )
    .regex(/^[a-zA-ZÀ-ÿ0-9\s]+$/, "Nome contém caracteres inválidos")
    .transform((val) => val.trim()),
});

// Função auxiliar para atraso (Tarpit)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    // ✅ NOVO: RATE LIMITING POR IP (10 tentativas/5min)
    const rateLimitResult = withRateLimit(
      request,
      "ip",
      10,
      300000, // 5 minutos
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

      console.warn(
        `[RATE LIMIT] IP ${ip} excedeu limite de tentativas de entrada (${rateLimitResult.retryAfter}s até reset)`,
      );

      return createRateLimitResponse(rateLimitResult);
    }

    // ✅ 2. VALIDAÇÃO DO PAYLOAD
    const rawBody = await request.json().catch(() => null);

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    let payload: z.infer<typeof JoinSessionSchema>;
    try {
      payload = JoinSessionSchema.parse(rawBody);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Dados inválidos",
            details: error.issues.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const { code, name } = payload;

    // ✅ 3. BUSCAR SESSÃO
    const sessao = await prisma.sessao.findUnique({
      where: { codigo_acesso: code },
      select: {
        id: true,
        nome: true,
        status: true,
        anfitriao_id: true,
      },
    });

    // ✅ 4. TARPIT: Atraso artificial para códigos inválidos
    if (!sessao || sessao.status !== "ABERTA") {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

      console.warn(
        `[SECURITY] Tentativa de acesso a sessão inválida: code=${code}, ip=${ip}`,
      );

      await delay(TARPIT_DELAY_MS); // Pausa de 2s

      return NextResponse.json(
        { error: "Sessão não encontrada ou encerrada." },
        { status: 404 },
      );
    }

    // ✅ 5. VERIFICAR LIMITE DE PARTICIPANTES
    const totalAtivos = await prisma.participante.count({
      where: { sessao_id: sessao.id, status: "ATIVO" },
    });

    if (totalAtivos >= MAX_PARTICIPANTS_PER_SESSION) {
      console.warn(
        `[SECURITY] Sessão ${sessao.id} cheia (${totalAtivos} participantes)`,
      );

      return NextResponse.json(
        {
          error: "Sessão está cheia.",
          hint: `Máximo de ${MAX_PARTICIPANTS_PER_SESSION} participantes atingido.`,
        },
        { status: 429 },
      );
    }

    // ✅ 6. BUSCAR OU CRIAR PARTICIPANTE
    let participante = await prisma.participante.findFirst({
      where: {
        sessao_id: sessao.id,
        nome: name,
      },
    });

    if (participante) {
      // Reativa se estava inativo
      if (participante.status !== "ATIVO") {
        participante = await prisma.participante.update({
          where: { id: participante.id },
          data: { status: "ATIVO" },
        });
      }
    } else {
      // Cria novo participante
      participante = await prisma.participante.create({
        data: {
          nome: name,
          sessao_id: sessao.id,
          status: "ATIVO",
        },
      });
    }

    // ✅ 7. RETORNAR DADOS DA SESSÃO
    return NextResponse.json(
      {
        success: true,
        session: {
          id: sessao.id,
          nome: sessao.nome,
          codigo: code,
        },
        participant: {
          id: participante.id,
          nome: participante.nome,
        },
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult?.remaining.toString() || "0",
          "X-RateLimit-Reset": rateLimitResult?.resetAt.toString() || "0",
        },
      },
    );
  } catch (error: any) {
    console.error("Erro em /api/session/join:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
