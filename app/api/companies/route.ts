// app/api/companies/route.ts
/**
 * Rota para gerenciar empresas do usuário.
 * Responsabilidades:
 * 1. GET: Listar empresas do usuário autenticado.
 * 2. POST: Criar nova empresa.
 * 3. ✅ RATE LIMITING: 100 req/min (GET), 10 empresas/dia (POST).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// GET: Listar empresas do usuário autenticado
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    // ✅ NOVO: RATE LIMITING (100 req/min por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      100,
      60000, // 1 minuto
      payload.userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${payload.userId} excedeu limite de leitura de empresas`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const hasPaginationParam = searchParams.has("page");

    if (hasPaginationParam) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "15", 10) || 15),
      );
      const skip = (page - 1) * limit;
      const query = searchParams.get("q")?.trim();
      const status = (searchParams.get("status") || "ALL").toUpperCase();

      const baseWhere: any = { usuario_id: payload.userId };
      const where: any = { ...baseWhere };

      if (status === "ACTIVE") where.ativo = true;
      else if (status === "INACTIVE") where.ativo = false;

      if (query) {
        where.OR = [
          { nome_fantasia: { contains: query, mode: "insensitive" } },
          { razao_social: { contains: query, mode: "insensitive" } },
          { cnpj: { contains: query, mode: "insensitive" } },
        ];
      }

      const [companies, filteredTotal, totalAll, totalActive] = await Promise.all([
        prisma.empresa.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ ativo: "desc" }, { created_at: "desc" }],
          select: {
            id: true,
            nome_fantasia: true,
            razao_social: true,
            cnpj: true,
            ativo: true,
            created_at: true,
          },
        }),
        prisma.empresa.count({ where }),
        prisma.empresa.count({ where: baseWhere }),
        prisma.empresa.count({ where: { ...baseWhere, ativo: true } }),
      ]);

      return NextResponse.json({
        success: true,
        companies: companies.map((c) => ({
          id: c.id,
          nomeFantasia: c.nome_fantasia,
          razaoSocial: c.razao_social,
          cnpj: c.cnpj,
          ativo: c.ativo,
          createdAt: c.created_at.toISOString(),
        })),
        meta: {
          total: filteredTotal,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
        },
        counts: {
          total: totalAll,
          active: totalActive,
          inactive: Math.max(0, totalAll - totalActive),
        },
      });
    }

    const companies = await prisma.empresa.findMany({
      where: { usuario_id: payload.userId },
      orderBy: [
        { ativo: "desc" }, // Ativos primeiro
        { created_at: "desc" },
      ],
      select: {
        id: true,
        nome_fantasia: true,
        razao_social: true,
        cnpj: true,
        ativo: true,
        created_at: true,
      },
    });

    // Converter para camelCase
    const formatted = companies.map((c) => ({
      id: c.id,
      nomeFantasia: c.nome_fantasia,
      razaoSocial: c.razao_social,
      cnpj: c.cnpj,
      ativo: c.ativo,
      createdAt: c.created_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      companies: formatted,
    });
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST: Criar nova empresa
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    // ✅ NOVO: RATE LIMITING (10 empresas/dia por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      10,
      86400000, // 1 dia (24 horas)
      payload.userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${payload.userId} excedeu limite de criação de empresas`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const { nomeFantasia, razaoSocial, cnpj } = body;

    // Validações
    if (!nomeFantasia || typeof nomeFantasia !== "string") {
      return NextResponse.json(
        { success: false, error: "Nome Fantasia é obrigatório" },
        { status: 400 },
      );
    }

    const trimmedNome = nomeFantasia.trim();
    if (trimmedNome.length === 0 || trimmedNome.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Nome Fantasia deve ter entre 1 e 200 caracteres",
        },
        { status: 400 },
      );
    }

    // Validar CNPJ se fornecido
    let finalCnpj: string | null = null;
    if (cnpj && typeof cnpj === "string") {
      const trimmedCnpj = cnpj.trim();
      if (trimmedCnpj.length > 0) {
        if (trimmedCnpj.length > 18) {
          return NextResponse.json(
            {
              success: false,
              error: "CNPJ muito longo (máximo 18 caracteres)",
            },
            { status: 400 },
          );
        }

        // Verificar se CNPJ já existe para este usuário
        const existing = await prisma.empresa.findFirst({
          where: {
            usuario_id: payload.userId,
            cnpj: trimmedCnpj,
          },
        });

        if (existing) {
          return NextResponse.json(
            { success: false, error: "CNPJ já cadastrado" },
            { status: 400 },
          );
        }

        finalCnpj = trimmedCnpj;
      }
    }

    // Criar empresa
    const company = await prisma.empresa.create({
      data: {
        usuario_id: payload.userId,
        nome_fantasia: trimmedNome,
        razao_social:
          razaoSocial &&
          typeof razaoSocial === "string" &&
          razaoSocial.trim().length > 0
            ? razaoSocial.trim().slice(0, 200)
            : null,
        cnpj: finalCnpj,
      },
      select: {
        id: true,
        nome_fantasia: true,
        razao_social: true,
        cnpj: true,
        ativo: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        nomeFantasia: company.nome_fantasia,
        razaoSocial: company.razao_social,
        cnpj: company.cnpj,
        ativo: company.ativo,
        createdAt: company.created_at.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar empresa:", error);

    // Erro de CNPJ duplicado (unique constraint)
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "CNPJ já cadastrado" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
