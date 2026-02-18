// lib/rate-limit.ts
/**
 * Sistema genérico de rate limiting para APIs.
 * Suporta múltiplos critérios: IP, userId, sessionId, custom.
 */

import { NextRequest, NextResponse } from "next/server";

// ✅ Estrutura de dados em memória (produção: Redis)
const rateLimitStore = new Map<string, { attempts: number; resetAt: number }>();

interface RateLimitConfig {
  key: string; // Identificador único (ex: "ip:192.168.1.1", "user:123")
  limit: number; // Máximo de requisições
  windowMs: number; // Janela de tempo em milissegundos
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // Segundos até poder tentar novamente
}

/**
 * Verifica rate limit genérico
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(config.key);

  // Limpa expirados
  if (record && now > record.resetAt) {
    rateLimitStore.delete(config.key);
  }

  const current = rateLimitStore.get(config.key);

  // Primeira requisição
  if (!current) {
    rateLimitStore.set(config.key, {
      attempts: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  current.attempts++;

  // Limite excedido
  if (current.attempts > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  // Dentro do limite
  return {
    allowed: true,
    remaining: config.limit - current.attempts,
    resetAt: current.resetAt,
  };
}

/**
 * Helper: Cria resposta de rate limit excedido
 */
export function createRateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Muitas requisições. Tente novamente mais tarde.",
      retryAfter: result.retryAfter,
      limit: result.resetAt,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(
          result.remaining + (result.retryAfter ? 0 : 1),
        ),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
        "Retry-After": String(result.retryAfter || 60),
      },
    },
  );
}

/**
 * Middleware: Aplica rate limit baseado em critério
 */
export function withRateLimit(
  request: NextRequest,
  criteria: "ip" | "user" | "session" | { custom: string },
  limit: number,
  windowMs: number,
  userId?: number,
  sessionId?: number,
): RateLimitResult | null {
  let key: string;

  if (criteria === "ip") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    key = `ip:${ip}`;
  } else if (criteria === "user" && userId) {
    key = `user:${userId}`;
  } else if (criteria === "session" && sessionId) {
    key = `session:${sessionId}`;
  } else if (typeof criteria === "object" && criteria.custom) {
    key = criteria.custom;
  } else {
    return null; // Critério inválido
  }

  return checkRateLimit({ key, limit, windowMs });
}

/**
 * Limpeza periódica de registros expirados
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // A cada 1 minuto
