// app/api/session/[sessionId]/products/route.ts
/**
 * Rota de API para listar produtos cadastrados em uma sessão específica.
 * Segurança:
 * - Requer autenticação (JWT)
 * - Verifica se usuário é anfitrião OU participante da sessão
 * - Valida status da sessão
 * Otimizações:
 * - Paginação por cursor
 * - Cache de 5 segundos
 * - Limite de 1000 itens
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AuthError, ForbiddenError } from "@/lib/auth";

// Configurações de paginação
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

// Cache simples em memória (melhor usar Redis em produção)
const cache = new Map<string, { data: any; expires: number }>();

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // ✅ 1. AUTENTICAÇÃO: Validar JWT
    let userId: number;
    try {
      const payload = await getAuthPayload();
      userId = payload.userId;
    } catch (error: any) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: "Autenticação necessária. Faça login." },
          { status: 401 },
        );
      }
      throw error;
    }

    // ✅ 2. AUTORIZAÇÃO: Verificar se é anfitrião ou participante
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
        anfitriao_id: true,
        participantes: {
          select: { id: true },
        },
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    // ✅ Verifica se é anfitrião OU participante
    const isAnfitriao = sessao.anfitriao_id === userId;
    const isParticipante = sessao.participantes.some((p) => p.id === userId);

    if (!isAnfitriao && !isParticipante) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Você não tem permissão para acessar esta sessão.",
        },
        { status: 403 },
      );
    }

    // ✅ 3. VALIDAR STATUS DA SESSÃO (retorna 409 se encerrada)
    if (sessao.status === "FINALIZADA" || sessao.status === "ENCERRANDO") {
      return NextResponse.json({ error: "Sessão encerrada" }, { status: 409 });
    }

    // ✅ Parâmetros de paginação
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || `${DEFAULT_PAGE_SIZE}`),
      MAX_PAGE_SIZE,
    );
    const includeAll = searchParams.get("all") === "true";

    // ✅ Verificar cache (TTL 5 segundos)
    // ⚠️ IMPORTANTE: Cache agora inclui userId (isola por usuário)
    const cacheKey = `session:${sessionId}:user:${userId}:products:${cursor}:${limit}:${includeAll}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // ✅ MODO PAGINADO (Recomendado para produção)
    if (!includeAll) {
      // 1. Buscar produtos com paginação por cursor
      const produtosSessao = await prisma.produtoSessao.findMany({
        where: { sessao_id: sessionId },
        take: limit + 1, // +1 para saber se há próxima página
        ...(cursor && {
          cursor: { id: parseInt(cursor) },
          skip: 1, // Pula o cursor
        }),
        orderBy: { id: "asc" },
        select: {
          id: true,
          codigo_produto: true,
          codigo_barras: true,
          descricao: true,
          saldo_sistema: true,
        },
      });

      const hasMore = produtosSessao.length > limit;
      const items = hasMore ? produtosSessao.slice(0, -1) : produtosSessao;

      // 2. Buscar saldos contados APENAS dos produtos desta página
      const codigosBarras = items
        .map((p) => p.codigo_barras)
        .filter((c): c is string => c !== null);

      const movimentos = await prisma.movimento.groupBy({
        by: ["codigo_barras"],
        where: {
          sessao_id: sessionId,
          codigo_barras: { in: codigosBarras },
        },
        _sum: { quantidade: true },
      });

      const saldosMap = new Map<string, number>();
      movimentos.forEach((m) => {
        if (m.codigo_barras && m._sum.quantidade) {
          saldosMap.set(m.codigo_barras, m._sum.quantidade.toNumber());
        }
      });

      // 3. Montar resultado paginado
      const resultado = items.map((prod) => ({
        codigo_produto: prod.codigo_produto,
        codigo_barras: prod.codigo_barras,
        descricao: prod.descricao,
        saldo_sistema: prod.saldo_sistema?.toNumber() || 0,
        saldo_contado: saldosMap.get(prod.codigo_barras || "") || 0,
      }));

      const response = {
        data: resultado,
        pagination: {
          hasMore,
          nextCursor: hasMore ? items[items.length - 1].id.toString() : null,
          limit,
        },
      };

      // Cache por 5 segundos
      cache.set(cacheKey, {
        data: response,
        expires: Date.now() + 5000,
      });

      return NextResponse.json(response);
    }

    // ✅ MODO COMPLETO (Apenas para sessões pequenas ou uso interno)
    const totalProdutos = await prisma.produtoSessao.count({
      where: { sessao_id: sessionId },
    });

    if (totalProdutos > 10000) {
      return NextResponse.json(
        {
          error: "Sessão muito grande. Use paginação (remova ?all=true)",
          totalProdutos,
          hint: "Use ?limit=100&cursor=123 para paginar",
        },
        { status: 413 },
      );
    }

    // Carrega tudo (modo legado)
    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
      select: {
        codigo_produto: true,
        codigo_barras: true,
        descricao: true,
        saldo_sistema: true,
      },
    });

    const movimentos = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: { sessao_id: sessionId },
      _sum: { quantidade: true },
    });

    const saldosMap = new Map<string, number>();
    movimentos.forEach((m) => {
      if (m.codigo_barras && m._sum.quantidade) {
        saldosMap.set(m.codigo_barras, m._sum.quantidade.toNumber());
      }
    });

    const resultado = produtosSessao.map((prod) => ({
      codigo_produto: prod.codigo_produto,
      codigo_barras: prod.codigo_barras,
      descricao: prod.descricao,
      saldo_sistema: prod.saldo_sistema?.toNumber() || 0,
      saldo_contado: saldosMap.get(prod.codigo_barras || "") || 0,
    }));

    const response = { data: resultado };

    // Cache por 5 segundos
    cache.set(cacheKey, {
      data: response,
      expires: Date.now() + 5000,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Erro ao listar produtos da sessão:", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 401 },
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
