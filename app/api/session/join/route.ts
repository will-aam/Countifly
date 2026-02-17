// app/api/session/join/route.ts
/**
 * Rota pública para entrada em sessões colaborativas.
 * Responsabilidade:
 * 1. Validar código de acesso e nome do participante.
 * 2. Verificar se a sessão existe e está aberta.
 * 3. Criar/reativar participante.
 * Segurança:
 * - Validação estrita de charset (alfanumérico)
 * - Rate limiting por IP (5 tentativas/minuto)
 * - Tarpit (2s) para códigos inválidos
 * - Proteção contra criação massiva
 * - Logs de tentativas suspeitas
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ✅ CONFIGURAÇÕES DE SEGURANÇA
const MAX_PARTICIPANTS_PER_SESSION = 10;
const MAX_CODE_LENGTH = 10;
const MAX_NAME_LENGTH = 30;
const TARPIT_DELAY_MS = 2000; // 2 segundos
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const RATE_LIMIT_MAX_ATTEMPTS = 5; // 5 tentativas por minuto

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

// ✅ RATE LIMITING EM MEMÓRIA (Por IP)
// Estrutura: Map<IP, { attempts: number, resetAt: number }>
const rateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

function getRateLimitKey(request: NextRequest): string {
  // Tenta pegar IP real (considerando proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return `join:${ip}`;
}

function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Limpa registros expirados
  if (record && now > record.resetAt) {
    rateLimitMap.delete(key);
  }

  const current = rateLimitMap.get(key);

  if (!current) {
    // Primeira tentativa
    rateLimitMap.set(key, {
      attempts: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_ATTEMPTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  // Incrementa tentativas
  current.attempts++;

  if (current.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_ATTEMPTS - current.attempts,
    resetAt: current.resetAt,
  };
}

// Função auxiliar para atraso (Tarpit)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    // ✅ 1. RATE LIMITING POR IP
    const rateLimitKey = getRateLimitKey(request);
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);

      console.warn(
        `[SECURITY] Rate limit excedido: ${rateLimitKey} (aguarde ${waitSeconds}s)`,
      );

      return NextResponse.json(
        {
          error: "Muitas tentativas. Aguarde antes de tentar novamente.",
          retryAfter: waitSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": waitSeconds.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        },
      );
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
      console.warn(
        `[SECURITY] Tentativa de acesso a sessão inválida: code=${code}, ip=${rateLimitKey}`,
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
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
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
