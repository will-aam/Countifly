// app/api/companies/[id]/route.ts
/**
 * Rota para atualizar empresa específica.
 * Responsabilidades:
 * 1. PATCH: Atualizar dados de uma empresa.
 * 2. ✅ RATE LIMITING: 30 req/hora por usuário.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await getAuthPayload();
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    // ✅ NOVO: RATE LIMITING (30 req/hora por usuário)
    const rateLimitResult = withRateLimit(
      request,
      "user",
      30,
      3600000, // 1 hora
      payload.userId,
    );

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(
        `[RATE LIMIT] Usuário ${payload.userId} excedeu limite de atualização de empresas`,
      );
      return createRateLimitResponse(rateLimitResult);
    }

    const companyId = parseInt(params.id);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 },
      );
    }

    // Verificar se a empresa pertence ao usuário
    const existing = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { usuario_id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Empresa não encontrada" },
        { status: 404 },
      );
    }

    if (existing.usuario_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { nomeFantasia, razaoSocial, cnpj } = body;

    // Validar nome fantasia
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

    // Validar CNPJ
    let finalCnpj: string | null = null;
    if (cnpj && typeof cnpj === "string") {
      const trimmedCnpj = cnpj.trim();
      if (trimmedCnpj.length > 0) {
        if (trimmedCnpj.length > 18) {
          return NextResponse.json(
            { success: false, error: "CNPJ muito longo" },
            { status: 400 },
          );
        }

        // Verificar se CNPJ já existe em outra empresa do usuário
        const duplicate = await prisma.empresa.findFirst({
          where: {
            usuario_id: payload.userId,
            cnpj: trimmedCnpj,
            id: { not: companyId },
          },
        });

        if (duplicate) {
          return NextResponse.json(
            { success: false, error: "CNPJ já cadastrado em outra empresa" },
            { status: 400 },
          );
        }

        finalCnpj = trimmedCnpj;
      }
    }

    // Atualizar empresa
    const updated = await prisma.empresa.update({
      where: { id: companyId },
      data: {
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
        id: updated.id,
        nomeFantasia: updated.nome_fantasia,
        razaoSocial: updated.razao_social,
        cnpj: updated.cnpj,
        ativo: updated.ativo,
        createdAt: updated.created_at.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar empresa:", error);

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
