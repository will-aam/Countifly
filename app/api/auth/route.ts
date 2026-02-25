// app/api/auth/route.ts
/**
 * Rota de API para autenticação do usuário (Login).
 * Responsabilidade:
 * 1. POST: Autenticar usuário e emitir token JWT via cookie seguro.
 * Segurança:
 * 1. Proteção contra enumeração de e-mails (constant-time authentication).
 * 2. Hash dummy executado mesmo quando usuário não existe.
 * 3. Rate limiting por IP e por email.
 * 4. Bloqueio temporário após N tentativas falhas.
 * 5. Logs de tentativas suspeitas.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import {
  getClientIp,
  checkIpRateLimit,
  checkEmailRateLimit,
  checkLockout,
  recordFailedLogin,
  clearFailedLogins,
} from "@/lib/auth-rate-limit";

// Constantes de segurança
const JWT_ISSUER = "countifly-system";
const JWT_AUDIENCE = "countifly-users";

// Hash dummy pré-gerado
const DUMMY_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMye/YqVvpUvYWPpVZuJlCpwZlYCp8A9aXG";

export async function POST(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Erro de configuração do servidor." },
        { status: 500 },
      );
    }

    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const clientIp = getClientIp(request);

    // ✅ 1. VERIFICAR RATE LIMIT POR IP
    const ipRateLimit = checkIpRateLimit(clientIp);
    if (!ipRateLimit.allowed) {
      const waitSeconds = Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000);

      console.warn(
        `[SECURITY] Rate limit IP excedido: ${clientIp} (email: ${email})`,
      );

      return NextResponse.json(
        {
          error:
            "Muitas tentativas de login. Aguarde antes de tentar novamente.",
          retryAfter: waitSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": waitSeconds.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // ✅ 2. VERIFICAR RATE LIMIT POR EMAIL
    const emailRateLimit = checkEmailRateLimit(email);
    if (!emailRateLimit.allowed) {
      const waitSeconds = Math.ceil(
        (emailRateLimit.resetAt - Date.now()) / 1000,
      );

      console.warn(
        `[SECURITY] Rate limit email excedido: ${email} (IP: ${clientIp})`,
      );

      return NextResponse.json(
        {
          error:
            "Muitas tentativas para esta conta. Aguarde antes de tentar novamente.",
          retryAfter: waitSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": waitSeconds.toString(),
          },
        },
      );
    }

    // ✅ 3. VERIFICAR BLOQUEIO (Lockout)
    const lockout = checkLockout(email);
    if (lockout.locked) {
      console.warn(
        `[SECURITY] Tentativa de login em conta bloqueada: ${email} (IP: ${clientIp})`,
      );

      return NextResponse.json(
        {
          error: `Conta temporariamente bloqueada por segurança. Tente novamente em ${lockout.remainingSeconds} segundos.`,
          lockedUntil: lockout.lockedUntil,
        },
        { status: 403 },
      );
    }

    // ✅ 4. BUSCAR USUÁRIO
    const user = await prisma.usuario.findUnique({ where: { email } });

    // ✅ 5. VALIDAR SENHA (constant-time)
    const hashToCompare = user?.senha_hash || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(senha, hashToCompare);

    // ✅ 6. VERIFICAR CREDENCIAIS
    if (!user || !isPasswordValid) {
      // ✅ Registra falha (incrementa contador)
      recordFailedLogin(email, clientIp);

      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    // ✅ 6.5 VERIFICAR SE O USUÁRIO ESTÁ ATIVO (A MÁGICA DE SEGURANÇA AQUI)
    if (!user.ativo) {
      return NextResponse.json(
        { error: "Conta desativada. Entre em contato para solicitar acesso." },
        { status: 403 },
      );
    }

    // ✅ 7. LOGIN BEM-SUCEDIDO: Limpa contadores
    clearFailedLogins(email);

    // Cria o token JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
      expiresIn: "1d",
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Define cookie seguro
    const cookieStore = cookies();
    cookieStore.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    console.log(`[AUTH] Login bem-sucedido: ${email} (IP: ${clientIp})`);

    return NextResponse.json({
      success: true,
      userId: user.id,
      preferredMode: user.preferred_mode ?? null,
    });
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
