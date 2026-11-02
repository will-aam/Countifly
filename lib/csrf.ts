// lib/csrf.ts
/**
 * Proteção contra CSRF através de verificação de Origin/Referer em métodos mutativos.
 * Funciona em conjunto com SameSite='strict', HttpOnly e Secure para defesa em profundidade.
 */

import { NextRequest } from "next/server";

export class CSRFError extends Error {
  public readonly statusCode = 403;

  constructor(message = "Requisição bloqueada por verificação de segurança de origem (CSRF).") {
    super(message);
    this.name = "CSRFError";
  }
}

/**
 * Retorna as origens explicitamente configuradas via variável de ambiente ou valores padrão seguros.
 */
function getConfiguredAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const defaultOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://countifly.com",
    "https://www.countifly.com",
  ];

  return Array.from(new Set([...defaultOrigins, ...envOrigins]));
}

/**
 * Extrai a origem segura da URL da própria requisição recebida pelo servidor.
 */
function getRequestServerOrigins(request: NextRequest): string[] {
  const origins: string[] = [];

  if (request.nextUrl?.origin) {
    origins.push(request.nextUrl.origin.toLowerCase());
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.nextUrl?.protocol ? request.nextUrl.protocol.replace(":", "") : "http");

  if (host) {
    origins.push(`${proto}://${host}`.toLowerCase());
  }

  return origins;
}

/**
 * Normaliza uma string de URL para obter apenas a origem (protocolo + host + porta opcional).
 */
function normalizeOrigin(urlStr: string): string | null {
  try {
    return new URL(urlStr).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Verifica se a origem informada é uma origem confiável/permitida.
 */
export function isAllowedOrigin(originCandidate: string, request: NextRequest): boolean {
  if (!originCandidate) return false;

  const normalized = normalizeOrigin(originCandidate);
  if (!normalized) return false;

  // 1. Verifica contra origens explicitamente permitidas (configuração/env)
  const allowed = getConfiguredAllowedOrigins();
  if (allowed.includes(normalized)) {
    return true;
  }

  // 2. Verifica contra a própria origem do servidor que está recebendo a requisição
  const serverOrigins = getRequestServerOrigins(request);
  if (serverOrigins.includes(normalized)) {
    return true;
  }

  return false;
}

/**
 * Valida a origem da requisição contra CSRF em rotas e métodos que modificam estado.
 * Métodos seguros (GET, HEAD, OPTIONS) são ignorados.
 */
export function validateOrigin(request: NextRequest): void {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(request.method)) {
    return;
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  // 1. Se o cabeçalho Origin estiver presente (requisições Fetch, AJAX, etc.)
  if (originHeader) {
    if (!isAllowedOrigin(originHeader, request)) {
      console.warn(`[CSRF] Bloqueado Origin não permitido: ${originHeader} para ${request.method} ${request.nextUrl.pathname}`);
      throw new CSRFError(`Origem não permitida: ${originHeader}`);
    }
    return;
  }

  // 2. Se não houver Origin, valida o Referer (submissão de forms ou navegadores antigos)
  if (refererHeader) {
    const refererOrigin = normalizeOrigin(refererHeader);
    if (!refererOrigin || !isAllowedOrigin(refererOrigin, request)) {
      console.warn(`[CSRF] Bloqueado Referer não permitido: ${refererHeader} para ${request.method} ${request.nextUrl.pathname}`);
      throw new CSRFError("Cabeçalho de referência (Referer) não permitido.");
    }
    return;
  }

  // 3. Sem Origin nem Referer em método mutativo
  // Se possuir o cookie de autenticação, é estritamente bloqueado (ataque CSRF sem headers de origem)
  const hasAuthCookie = request.cookies.has("authToken");
  if (hasAuthCookie) {
    console.warn(`[CSRF] Bloqueada requisição autenticada por cookie sem Origin/Referer: ${request.method} ${request.nextUrl.pathname}`);
    throw new CSRFError("Requisições autenticadas por cookie exigem cabeçalho de origem válido.");
  }

  // Se não possuir cookie de autenticação, aceita caso possua um cabeçalho customizado (como X-Requested-With)
  const customHeader = request.headers.get("x-requested-with") || request.headers.get("x-countifly-client");
  if (!customHeader) {
    console.warn(`[CSRF] Bloqueada requisição mutativa sem Origin/Referer/Custom Header: ${request.method} ${request.nextUrl.pathname}`);
    throw new CSRFError("Requisição sem cabeçalho de origem ou identificador seguro.");
  }
}
