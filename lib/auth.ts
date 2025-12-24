import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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
  iss?: string;
  aud?: string;
}

// Constantes de segurança
const JWT_ISSUER = "countifly-system";
const JWT_AUDIENCE = "countifly-users";

/**
 * Nova função: valida o token JWT do cookie e retorna o payload,
 * sem checar paramsUserId. Útil para rotas "genéricas" como
 * /api/auth/change-password.
 */
export async function getAuthPayload(): Promise<TokenPayload> {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error(
      "CRITICAL: JWT_SECRET não está configurado nas variáveis de ambiente."
    );
    throw new AppError("Erro interno de configuração do servidor.", 500);
  }

  const token = cookies().get("authToken")?.value;

  if (!token) {
    throw new AuthError("Sessão expirada ou inválida. Faça login novamente.");
  }

  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as TokenPayload;

    return payload;
  } catch (error) {
    throw new AuthError("Token de acesso inválido ou violado.");
  }
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
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    // Log interno detalhado para o desenvolvedor
    console.error(
      "CRITICAL: JWT_SECRET não está configurado nas variáveis de ambiente."
    );
    // Erro genérico para o cliente (Segurança: não vazamos detalhes da infra)
    throw new AppError("Erro interno de configuração do servidor.", 500);
  }

  const token = cookies().get("authToken")?.value;

  if (!token) {
    // Substituímos o erro genérico pelo AuthError (401)
    throw new AuthError("Sessão expirada ou inválida. Faça login novamente.");
  }

  let payload: TokenPayload;

  try {
    payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as TokenPayload;
  } catch (error) {
    // Qualquer falha do JWT (expirado, assinatura ruim) vira um 401 limpo
    throw new AuthError("Token de acesso inválido ou violado.");
  }

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
  controller: ReadableStreamDefaultController<any>,
  encoder: TextEncoder,
  message: string,
  status: number
) {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ error: message, status })}\n\n`)
  );
  controller.close();
}
