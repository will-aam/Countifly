// lib/auth.ts
// Funções de autenticação e autorização do sistema
// Serve para validar tokens JWT e gerenciar erros relacionados
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// --- NOVAS CLASSES DE ERRO (Padronização) ---

/**
 * Classe base para erros operacionais da aplicação.
 * Permite definir um statusCode HTTP explícito.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Necessário para o instanceof funcionar corretamente ao estender classes nativas no TS/JS moderno
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Erro 401: Falha na autenticação (Token ausente, inválido ou expirado).
 */
export class AuthError extends AppError {
  constructor(message = "Acesso não autorizado.") {
    super(message, 401);
  }
}

export class InactiveAccountError extends AuthError {
  constructor() {
    super("Conta desativada. Entre em contato com o administrador.");
  }
}

/**
 * Erro 403: Falha na autorização (Usuário logado, mas sem permissão para o recurso).
 */
export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para acessar este recurso.") {
    super(message, 403);
  }
}

// ------------------------------------------------------------

interface TokenPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
  jti: string;
  iss?: string;
  aud?: string;
}

// Constantes de segurança
const JWT_ISSUER = "countifly-system";
const JWT_AUDIENCE = "countifly-users";

async function assertActiveAuthSession(payload: TokenPayload): Promise<void> {
  if (!payload.jti) {
    throw new AuthError("Sessão inválida. Faça login novamente.");
  }

  const session = await prisma.authSession.findUnique({
    where: { id: payload.jti },
    select: {
      user_id: true,
      expires_at: true,
      revoked_at: true,
      usuario: { select: { ativo: true } },
    },
  });

  if (!session || session.user_id !== payload.userId) {
    throw new AuthError("Sessão inválida. Faça login novamente.");
  }
  if (!session.usuario.ativo) {
    throw new InactiveAccountError();
  }
  if (session.revoked_at || session.expires_at <= new Date()) {
    throw new AuthError(
      "Sessão expirada ou revogada. Faça login novamente.",
    );
  }
}

export function verifyAuthToken(token: string): TokenPayload {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("Erro interno de configuração do servidor.", 500);
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as TokenPayload;
  } catch {
    throw new AuthError("Token de acesso inválido ou violado.");
  }

  if (
    typeof payload.userId !== "number" ||
    typeof payload.jti !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.jti)
  ) {
    throw new AuthError("Token de acesso inválido ou violado.");
  }

  return payload;
}

export const AUTH_COOKIE_NAME = "authToken";

export interface AuthCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  domain?: string;
  maxAge?: number;
}

/**
 * Opções padronizadas para o cookie de autenticação JWT,
 * reforçando segurança contra CSRF e vazamento entre domínios.
 */
export function getAuthCookieOptions(): AuthCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const explicitDomain =
    process.env.COOKIE_DOMAIN ||
    (isProduction ? process.env.NEXT_PUBLIC_DOMAIN : undefined);

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    ...(explicitDomain ? { domain: explicitDomain } : {}),
  };
}

/**
 * Nova função: valida o token JWT do cookie e retorna o payload,
 * sem checar paramsUserId. Útil para rotas "genéricas" como
 * /api/auth/change-password.
 */
export async function getAuthPayload(): Promise<TokenPayload> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new AuthError("Sessão expirada ou inválida. Faça login novamente.");
  }

  const payload = verifyAuthToken(token);
  await assertActiveAuthSession(payload);
  return payload;
}

/**
 * Função existente: valida o token JWT e ainda compara o userId do token
 * com o userId vindo da rota (paramsUserId). Use para rotas do tipo
 * /api/alguma-coisa/[userId].
 */
export async function validateAuth(
  request: NextRequest,
  paramsUserId: number
): Promise<TokenPayload> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    // Substituímos o erro genérico pelo AuthError (401)
    throw new AuthError("Sessão expirada ou inválida. Faça login novamente.");
  }

  const payload = verifyAuthToken(token);
  await assertActiveAuthSession(payload);

  // Validação de Autorização (ID da rota vs ID do Token)
  if (payload.userId !== paramsUserId) {
    // Substituímos a mensagem de texto pelo ForbiddenError (403)
    throw new ForbiddenError();
  }

  return payload;
}

// Helper de erro SSE
// Mantido conforme solicitado, mas agora podemos passar o status com mais confiança
export function createSseErrorResponse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  message: string,
  status: number
) {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ error: message, status })}\n\n`)
  );
  controller.close();
}
