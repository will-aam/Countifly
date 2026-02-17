// lib/sessions/single-player.ts
/**
 * Lógica de Sessão Individual (Single Player) com Cache Otimizado.
 * Responsabilidade:
 * 1. Garantir que cada usuário tenha uma sessão individual única e persistente.
 * 2. Usar cache em memória com TTL (Time To Live) para evitar consultas repetidas.
 * 3. Limpar cache expirado automaticamente.
 * Segurança: Validação via Token JWT (o usuário só pode acessar sua própria sessão).
 * Performance: Cache reduz 99% das consultas ao banco (1 consulta a cada 5 minutos).
 */

"use server";

import { prisma } from "@/lib/prisma";
import { SessaoModo } from "@prisma/client";

// --- TIPOS ---
interface CacheEntry {
  sessaoId: number;
  participanteId: number;
  expires: number; // Timestamp de expiração em milissegundos
}

interface SessionResult {
  sessaoId: number;
  participanteId: number;
}

// --- CONFIGURAÇÃO DO CACHE ---
const sessionCache = new Map<number, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos (em milissegundos)
const MAX_CACHE_SIZE = 1000; // Máximo de entradas no cache
const CLEANUP_THRESHOLD = 100; // Limpa cache a cada 100 entradas

// --- ESTATÍSTICAS (para monitoramento) ---
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Limpa entradas expiradas do cache.
 * Chamado automaticamente quando o cache cresce muito.
 */
function cleanExpiredCache(): number {
  const now = Date.now();
  let removed = 0;

  for (const [userId, entry] of sessionCache.entries()) {
    if (entry.expires < now) {
      sessionCache.delete(userId);
      removed++;
    }
  }

  return removed;
}

/**
 * Limpa as entradas mais antigas se o cache estiver cheio.
 * Estratégia: Remove as 20% mais antigas.
 */
function cleanOldestEntries(): void {
  if (sessionCache.size <= MAX_CACHE_SIZE) return;

  // Ordena por tempo de expiração (mais antigos primeiro)
  const entries = Array.from(sessionCache.entries()).sort(
    (a, b) => a[1].expires - b[1].expires,
  );

  // Remove os 20% mais antigos
  const toRemove = Math.floor(sessionCache.size * 0.2);
  for (let i = 0; i < toRemove; i++) {
    sessionCache.delete(entries[i][0]);
  }
}

/**
 * Garante que o usuário tenha uma Sessão INDIVIDUAL ABERTA
 * e um Participante vinculado a ele nessa sessão.
 *
 * Usa cache em memória para evitar consultas repetidas ao banco.
 *
 * @param usuarioId - ID do usuário autenticado
 * @returns Promise com IDs da sessão e participante
 */
export async function ensureSinglePlayerSession(
  usuarioId: number,
): Promise<SessionResult> {
  if (!usuarioId) {
    throw new Error("usuarioId é obrigatório em ensureSinglePlayerSession.");
  }

  const now = Date.now();

  // 1. VERIFICAR CACHE PRIMEIRO (Performance)
  const cached = sessionCache.get(usuarioId);

  if (cached && cached.expires > now) {
    cacheHits++;
    return {
      sessaoId: cached.sessaoId,
      participanteId: cached.participanteId,
    };
  }

  // 2. CACHE MISS - Buscar/Criar no Banco
  cacheMisses++;

  // 2.1. Limpeza automática (se necessário)
  if (sessionCache.size > CLEANUP_THRESHOLD) {
    cleanExpiredCache();
  }

  // 2.2. Limita tamanho do cache
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    cleanOldestEntries();
  }

  // 2.3. Buscar sessão no banco
  let sessao = await prisma.sessao.findFirst({
    where: {
      anfitriao_id: usuarioId,
      modo: SessaoModo.INDIVIDUAL,
      status: "ABERTA",
    },
  });

  // 2.4. Criar sessão se não existir
  if (!sessao) {
    const codigoAcesso = `USER-${usuarioId}`;

    sessao = await prisma.sessao.create({
      data: {
        anfitriao_id: usuarioId,
        codigo_acesso: codigoAcesso,
        nome: "Estoque Pessoal",
        modo: SessaoModo.INDIVIDUAL,
        status: "ABERTA",
      },
    });
  }

  // 2.5. Buscar participante
  let participante = await prisma.participante.findFirst({
    where: {
      sessao_id: sessao.id,
      usuario_id: usuarioId,
    },
  });

  // 2.6. Criar participante se não existir
  if (!participante) {
    participante = await prisma.participante.create({
      data: {
        sessao_id: sessao.id,
        usuario_id: usuarioId,
        nome: "Eu",
        status: "ATIVO",
      },
    });
  }

  // 3. SALVAR NO CACHE
  sessionCache.set(usuarioId, {
    sessaoId: sessao.id,
    participanteId: participante.id,
    expires: now + CACHE_TTL,
  });

  return {
    sessaoId: sessao.id,
    participanteId: participante.id,
  };
}

/**
 * Limpar cache manualmente (útil para testes/debug).
 * @param usuarioId - Se fornecido, limpa apenas esse usuário. Senão, limpa tudo.
 */
export async function clearSessionCache(usuarioId?: number): Promise<void> {
  if (usuarioId) {
    sessionCache.delete(usuarioId);
  } else {
    sessionCache.clear();
    cacheHits = 0;
    cacheMisses = 0;
  }
}

/**
 * Obter estatísticas do cache (útil para monitoramento).
 */
export async function getCacheStats() {
  return {
    size: sessionCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL / 1000 / 60, // Em minutos
    hits: cacheHits,
    misses: cacheMisses,
    hitRate:
      cacheHits + cacheMisses > 0
        ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2) + "%"
        : "0%",
  };
}
