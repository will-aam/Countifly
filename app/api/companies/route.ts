// app/api/companies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

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
