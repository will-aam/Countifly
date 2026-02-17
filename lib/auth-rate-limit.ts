// lib/auth-rate-limit.ts
/**
 * Sistema de rate limiting e proteção contra brute force para autenticação.
 * Implementa:
 * - Rate limiting por IP (10 tentativas/minuto)
 * - Rate limiting por email (5 tentativas/5min)
 * - Bloqueio temporário após N falhas (15 minutos)
 * - Detecção de padrões de ataque
 * - Logs de segurança
 */

import { NextRequest } from "next/server";

// ✅ CONFIGURAÇÕES
const RATE_LIMIT_IP_ATTEMPTS = 10; // Tentativas por IP
const RATE_LIMIT_IP_WINDOW_MS = 60000; // 1 minuto
const RATE_LIMIT_EMAIL_ATTEMPTS = 5; // Tentativas por email
const RATE_LIMIT_EMAIL_WINDOW_MS = 300000; // 5 minutos
const LOCKOUT_THRESHOLD = 5; // Falhas até bloqueio
const LOCKOUT_DURATION_MS = 900000; // 15 minutos de bloqueio

// ✅ ESTRUTURAS DE DADOS EM MEMÓRIA
// Produção: usar Redis para compartilhar entre instâncias

// Rate limit por IP: Map<IP, { attempts: number, resetAt: number }>
const ipRateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

// Rate limit por email: Map<email, { attempts: number, resetAt: number }>
const emailRateLimitMap = new Map<
  string,
  { attempts: number; resetAt: number }
>();

// Bloqueios: Map<email, { lockedUntil: number, failedAttempts: number }>
const lockoutMap = new Map<
  string,
  { lockedUntil: number; failedAttempts: number }
>();

/**
 * Extrai IP real do request (considera proxies)
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  return (
    cfConnectingIp || forwarded?.split(",")[0].trim() || realIp || "unknown"
  );
}

/**
 * Verifica rate limit por IP
 */
export function checkIpRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  // Limpa se expirado
  if (record && now > record.resetAt) {
    ipRateLimitMap.delete(ip);
  }

  const current = ipRateLimitMap.get(ip);

  if (!current) {
    ipRateLimitMap.set(ip, {
      attempts: 1,
      resetAt: now + RATE_LIMIT_IP_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_IP_ATTEMPTS - 1,
      resetAt: now + RATE_LIMIT_IP_WINDOW_MS,
    };
  }

  current.attempts++;

  if (current.attempts > RATE_LIMIT_IP_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_IP_ATTEMPTS - current.attempts,
    resetAt: current.resetAt,
  };
}

/**
 * Verifica rate limit por email
 */
export function checkEmailRateLimit(email: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = emailRateLimitMap.get(email.toLowerCase());

  if (record && now > record.resetAt) {
    emailRateLimitMap.delete(email.toLowerCase());
  }

  const current = emailRateLimitMap.get(email.toLowerCase());

  if (!current) {
    emailRateLimitMap.set(email.toLowerCase(), {
      attempts: 1,
      resetAt: now + RATE_LIMIT_EMAIL_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_EMAIL_ATTEMPTS - 1,
      resetAt: now + RATE_LIMIT_EMAIL_WINDOW_MS,
    };
  }

  current.attempts++;

  if (current.attempts > RATE_LIMIT_EMAIL_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_EMAIL_ATTEMPTS - current.attempts,
    resetAt: current.resetAt,
  };
}

/**
 * Verifica se email está bloqueado
 */
export function checkLockout(email: string): {
  locked: boolean;
  lockedUntil: number;
  remainingSeconds: number;
} {
  const now = Date.now();
  const record = lockoutMap.get(email.toLowerCase());

  if (!record) {
    return { locked: false, lockedUntil: 0, remainingSeconds: 0 };
  }

  if (now > record.lockedUntil) {
    // Bloqueio expirou
    lockoutMap.delete(email.toLowerCase());
    return { locked: false, lockedUntil: 0, remainingSeconds: 0 };
  }

  return {
    locked: true,
    lockedUntil: record.lockedUntil,
    remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
  };
}

/**
 * Registra tentativa de login falha
 */
export function recordFailedLogin(email: string, ip: string): void {
  const now = Date.now();
  const record = lockoutMap.get(email.toLowerCase()) || {
    lockedUntil: 0,
    failedAttempts: 0,
  };

  record.failedAttempts++;

  // Se atingiu threshold, bloqueia
  if (record.failedAttempts >= LOCKOUT_THRESHOLD) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;

    console.warn(
      `[SECURITY] Conta bloqueada por brute force: ${email} (IP: ${ip})`,
    );
  }

  lockoutMap.set(email.toLowerCase(), record);

  // Log de segurança
  console.warn(
    `[SECURITY] Login falho: ${email} (IP: ${ip}, falhas: ${record.failedAttempts})`,
  );
}

/**
 * Limpa contador de falhas (login bem-sucedido)
 */
export function clearFailedLogins(email: string): void {
  lockoutMap.delete(email.toLowerCase());
  emailRateLimitMap.delete(email.toLowerCase());
}

/**
 * Limpa caches periodicamente (garbage collection)
 */
setInterval(() => {
  const now = Date.now();

  // Limpa rate limits expirados
  for (const [key, value] of ipRateLimitMap.entries()) {
    if (now > value.resetAt) {
      ipRateLimitMap.delete(key);
    }
  }

  for (const [key, value] of emailRateLimitMap.entries()) {
    if (now > value.resetAt) {
      emailRateLimitMap.delete(key);
    }
  }

  // Limpa bloqueios expirados
  for (const [key, value] of lockoutMap.entries()) {
    if (now > value.lockedUntil) {
      lockoutMap.delete(key);
    }
  }
}, 60000); // Limpa a cada 1 minuto
