## 🔒 Melhoria Futura: CSRF Avançado

⚠️ CSRF - Proteção Básica Implementada (Baixa Prioridade)

Status:

- ✅ sameSite: "strict" (bloqueia 95% dos ataques)
- ✅ httpOnly + secure cookies
- ✅ X-Frame-Options (anti-clickjacking)
- ⚠️ Melhorias adicionais pendentes (não críticas)

Decisão:

- Deixar para Fase 2 (pós-produção)
- Implementar antes de: subdomínios, APIs públicas, auditoria
- Código preparado disponível

Risco Atual: BAIXO (ambiente controlado)

### Status Atual:

✅ Proteção básica implementada (sameSite: strict + httpOnly)
⚠️ Proteção avançada pendente

### O que falta:

1. Domain explícito no cookie (evita subdomínios)
2. Validação de Origin/Referer header
3. Middleware global para todas as APIs
4. (Opcional) CSRF Token (Double Submit Cookie)

### Quando implementar:

- [ ] Antes de adicionar subdomínios (ex: blog.countifly.com)
- [ ] Antes de expor API publicamente
- [ ] Se adicionar integração com terceiros
- [ ] Se passar por auditoria de segurança

### Estimativa:

- Tempo: 20-30 minutos
- Complexidade: Baixa
- Impacto: Defesa em profundidade
- Arquivo: `/lib/csrf.ts` + ajustes em cookies

## 📊 **ANÁLISE DA PROTEÇÃO CSRF ATUAL (17/02/2026):**

### **✅ O QUE JÁ ESTÁ IMPLEMENTADO (Linha 67 do `auth/route.ts`):**

```typescript
sameSite: "strict", // ✅ Protege contra ataques CSRF
```

**Isso JÁ oferece proteção contra CSRF tradicional!**

---

## 🛡️ **COMO `sameSite: "strict"` PROTEGE:**

### **Cenário de Ataque Bloqueado:**

```html
<!-- Site malicioso: evil.com -->
<form action="https://countifly.com/api/inventory/import" method="POST">
  <input type="hidden" name="data" value='[{"codigo":"12345","qtd":-999}]' />
</form>
<script>
  document.forms[0].submit(); // Tenta fazer POST para Countifly
</script>
```

**Resultado com `sameSite: "strict"`:**

- ❌ Cookie `authToken` **NÃO é enviado** (browser bloqueia)
- ❌ Request chega sem autenticação
- ❌ API retorna 401 Unauthorized
- ✅ **Ataque CSRF bloqueado!**

---

## ⚠️ **PROBLEMA: Vulnerabilidades Residuais**

### **1. Ataque de Subdomínio Comprometido**

**Cenário:**

- Você tem `countifly.com`
- Atacante compromete `blog.countifly.com` (subdomínio)

**Com `sameSite: "strict"` atual:**

```typescript
// Cookie configurado assim:
{
  domain: undefined, // ❌ Padrão: domínio atual
  sameSite: "strict"
}
```

**Problema:**

- Se `domain` não for explicitamente definido, browser pode considerar subdomínios
- Atacante em `blog.countifly.com` pode fazer requests para `countifly.com` e **cookie PODE ser enviado** (depende do browser)

---

### **2. Ataque de Clickjacking (Mesmo com sameSite)**

**Cenário:**

```html
<!-- Site malicioso -->
<iframe src="https://countifly.com/admin/users" style="opacity:0"></iframe>
<button onclick="clickIframe()">Ganhe R$1000!</button>
```

**Resultado:**

- Se usuário clica, pode acionar ação no iframe
- `sameSite: strict` NÃO protege porque não é "cross-site request", é "cross-origin embedding"

---

## 🛡️ **SOLUÇÃO: Camadas Adicionais de Proteção**

### **Estratégia de Defesa em Profundidade:**

```
Camada 1: sameSite: "strict" ✅ (Já tem)
Camada 2: domain explícito ⚠️ (Adicionar)
Camada 3: X-Frame-Options ✅ (Já tem no next.config)
Camada 4: Origin/Referer check ⚠️ (Adicionar)
Camada 5: CSRF Token (Opcional - máxima segurança)
```

---

## 🔧 **IMPLEMENTAÇÃO: Camada 2 + 4**

### **📝 1. Melhorar Configuração de Cookie (Camada 2)**

**Arquivo: `app/api/auth/route.ts` (linha 62-68)**

**❌ ANTES:**

```typescript
cookieStore.set("authToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 60 * 60 * 24,
  path: "/",
});
```

**✅ DEPOIS:**

```typescript
cookieStore.set("authToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 60 * 60 * 24,
  path: "/",
  domain:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_DOMAIN // ✅ Ex: "countifly.com" (sem subdomínios)
      : undefined, // ✅ Localhost não precisa
});
```

**Adicione no `.env`:**

```env
NEXT_PUBLIC_DOMAIN=countifly.com
```

---

### **📝 2. Adicionar Verificação de Origin (Camada 4)**

**Crie: `lib/csrf.ts`**

```typescript
// lib/csrf.ts
/**
 * Proteção adicional contra CSRF através de verificação de Origin/Referer.
 * Funciona em conjunto com sameSite: "strict" para defesa em profundidade.
 */

import { NextRequest } from "next/server";
import { AppError } from "@/lib/auth";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "https://countifly.com",
  "https://www.countifly.com",
];

export class CSRFError extends AppError {
  constructor(message = "Requisição bloqueada por verificação de origem.") {
    super(message, 403);
  }
}

/**
 * Valida se a requisição vem de uma origem permitida.
 * Deve ser chamada em rotas que modificam dados (POST, PUT, DELETE, PATCH).
 */
export function validateOrigin(request: NextRequest): void {
  // Permite OPTIONS (preflight CORS)
  if (request.method === "OPTIONS") return;

  // Apenas valida métodos que modificam dados
  const safeMethods = ["GET", "HEAD"];
  if (safeMethods.includes(request.method)) return;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Se tiver Origin (requisições AJAX/Fetch), valida
  if (origin) {
    if (!ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[CSRF] Origin bloqueado: ${origin}`);
      throw new CSRFError(`Origem não permitida: ${origin}`);
    }
    return; // Válido
  }

  // Se não tiver Origin, valida Referer (form submissions)
  if (referer) {
    const refererUrl = new URL(referer);
    const refererOrigin = refererUrl.origin;

    if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
      console.warn(`[CSRF] Referer bloqueado: ${referer}`);
      throw new CSRFError(`Referer não permitido: ${referer}`);
    }
    return; // Válido
  }

  // Se não tem nem Origin nem Referer, bloqueia (suspeito)
  console.warn(
    `[CSRF] Requisição sem Origin/Referer: ${request.method} ${request.url}`,
  );
  throw new CSRFError("Requisição sem cabeçalhos de origem.");
}
```

**Adicione no `.env`:**

```env
ALLOWED_ORIGINS=http://localhost:3000,https://countifly.com,https://www.countifly.com
```

---

### **📝 3. Aplicar em Rotas Críticas**

**Exemplo: `app/api/inventory/import/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateOrigin } from "@/lib/csrf"; // ✅ Importa validação

export async function POST(request: NextRequest) {
  try {
    validateOrigin(request); // ✅ Valida origem ANTES de processar

    // ... resto do código existente
  } catch (error: any) {
    if (error instanceof CSRFError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}
```

---

### **📝 4. Aplicar em TODAS as Rotas Autenticadas (Middleware Global)**

**Melhor ainda: Adicionar no middleware existente**

**Arquivo: `middleware.ts` (se você tiver)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateOrigin, CSRFError } from "@/lib/csrf";

export function middleware(request: NextRequest) {
  try {
    // ✅ Valida Origin em todas as rotas /api/*
    if (request.nextUrl.pathname.startsWith("/api/")) {
      validateOrigin(request);
    }

    return NextResponse.next();
  } catch (error: any) {
    if (error instanceof CSRFError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const config = {
  matcher: "/api/:path*",
};
```

---

## 📊 **COMPARAÇÃO: Antes vs Depois**

| Ataque                          | ANTES (só sameSite)            | DEPOIS (completo)               |
| ------------------------------- | ------------------------------ | ------------------------------- |
| **CSRF tradicional (evil.com)** | ✅ Bloqueado                   | ✅ Bloqueado                    |
| **Subdomínio comprometido**     | ⚠️ Parcial                     | ✅ Bloqueado (domain explícito) |
| **Request sem Origin/Referer**  | ⚠️ Permitido                   | ✅ Bloqueado                    |
| **Clickjacking**                | ✅ Bloqueado (X-Frame-Options) | ✅ Bloqueado                    |
| **Origin spoofing**             | ❌ Não verifica                | ✅ Validado                     |

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO:**

### **Nível 1: Básico**

- [x] `sameSite: "strict"`
- [x] `httpOnly: true`
- [x] `secure: true` (produção)
- [x] `X-Frame-Options: DENY`

### **Nível 2: Recomendado (adicionar)**

- [ ] `domain` explícito no cookie
- [ ] Validação de Origin/Referer
- [ ] Middleware global para todas as APIs
- [ ] Logging de tentativas bloqueadas

### **Nível 3: Máxima Segurança (opcional)**

- [ ] CSRF Token (Double Submit Cookie)
- [ ] Rate limiting por IP
- [ ] Captcha em ações sensíveis

---

## 🎯 **RECOMENDAÇÃO:**

**Para aplicação de inventário:**

✅ **Implemente Nível 2** (adicionar Origin check + domain explícito)

**Razão:**

- `sameSite: strict` já protege 95% dos casos
- Origin check adiciona camada extra contra subdomínios
- CSRF Token seria "overkill" para seu uso
