// scripts/test-csrf.ts
import { validateOrigin, isAllowedOrigin, CSRFError } from "../lib/csrf";

// Mock simples de NextRequest
function createMockRequest(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) {
  const headersMap = new Map<string, string>();
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headersMap.set(key.toLowerCase(), value);
    }
  }

  const cookiesMap = new Map<string, string>();
  if (options.cookies) {
    for (const [key, value] of Object.entries(options.cookies)) {
      cookiesMap.set(key, value);
    }
  }

  const parsedUrl = new URL(options.url);

  return {
    method: options.method,
    url: options.url,
    nextUrl: parsedUrl,
    headers: {
      get: (header: string) => headersMap.get(header.toLowerCase()) || null,
    },
    cookies: {
      get: (name: string) =>
        cookiesMap.has(name) ? { name, value: cookiesMap.get(name)! } : undefined,
      has: (name: string) => cookiesMap.has(name),
    },
  } as any;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log("=== INICIANDO TESTES DO MÓDULO CSRF ===\n");

// 1. GET seguro
try {
  const req = createMockRequest({
    method: "GET",
    url: "https://countifly.com/api/inventory",
  });
  validateOrigin(req);
  assert(true, "Método GET seguro é ignorado sem restrição");
} catch (e: any) {
  assert(false, `Método GET falhou inesperadamente: ${e.message}`);
}

// 2. POST legítimo de localhost
try {
  const req = createMockRequest({
    method: "POST",
    url: "http://localhost:3000/api/inventory/import",
    headers: { origin: "http://localhost:3000" },
  });
  validateOrigin(req);
  assert(true, "POST com Origin localhost:3000 é aceito");
} catch (e: any) {
  assert(false, `POST localhost falhou: ${e.message}`);
}

// 3. POST legítimo de produção countifly.com
try {
  const req = createMockRequest({
    method: "POST",
    url: "https://countifly.com/api/inventory/item",
    headers: { origin: "https://countifly.com" },
  });
  validateOrigin(req);
  assert(true, "POST com Origin countifly.com é aceito");
} catch (e: any) {
  assert(false, `POST countifly.com falhou: ${e.message}`);
}

// 4. POST de site malicioso (evil.com) -> DEVE BLOQUEAR
try {
  const req = createMockRequest({
    method: "POST",
    url: "https://countifly.com/api/inventory/import",
    headers: { origin: "https://evil.com" },
    cookies: { authToken: "jwt-token-aqui" },
  });
  validateOrigin(req);
  assert(false, "POST de evil.com deveria ter sido bloqueado");
} catch (e: any) {
  assert(
    e instanceof CSRFError && e.statusCode === 403,
    "POST de evil.com bloqueado com 403 Forbidden"
  );
}

// 5. POST de subdomínio comprometido (blog.countifly.com) -> DEVE BLOQUEAR
try {
  const req = createMockRequest({
    method: "POST",
    url: "https://countifly.com/api/inventory/import",
    headers: { origin: "https://blog.countifly.com" },
    cookies: { authToken: "jwt-token-aqui" },
  });
  validateOrigin(req);
  assert(false, "POST de blog.countifly.com deveria ter sido bloqueado");
} catch (e: any) {
  assert(
    e instanceof CSRFError && e.statusCode === 403,
    "POST de subdomínio não autorizado bloqueado com 403 Forbidden"
  );
}

// 6. POST via Referer malicioso
try {
  const req = createMockRequest({
    method: "POST",
    url: "https://countifly.com/api/inventory/import",
    headers: { referer: "https://attacker.net/login-phish" },
    cookies: { authToken: "jwt-token-aqui" },
  });
  validateOrigin(req);
  assert(false, "POST com Referer invasor deveria ter sido bloqueado");
} catch (e: any) {
  assert(
    e instanceof CSRFError && e.statusCode === 403,
    "POST com Referer invasor bloqueado com 403 Forbidden"
  );
}

// 7. POST via Referer legítimo
try {
  const req = createMockRequest({
    method: "POST",
    url: "https://countifly.com/api/inventory/import",
    headers: { referer: "https://countifly.com/inventory/audit" },
  });
  validateOrigin(req);
  assert(true, "POST com Referer legítimo é aceito");
} catch (e: any) {
  assert(false, `POST com Referer legítimo falhou: ${e.message}`);
}

// 8. POST com cookie authToken sem Origin nem Referer -> DEVE BLOQUEAR
try {
  const req = createMockRequest({
    method: "POST",
    url: "https://countifly.com/api/inventory/item",
    cookies: { authToken: "jwt-token-aqui" },
  });
  validateOrigin(req);
  assert(false, "POST autenticado sem headers de origem deveria ser bloqueado");
} catch (e: any) {
  assert(
    e instanceof CSRFError && e.statusCode === 403,
    "POST autenticado sem headers de origem bloqueado com 403 Forbidden"
  );
}

console.log(`\n=== RESULTADO: ${passed} passaram, ${failed} falharam ===`);
if (failed > 0) process.exit(1);
