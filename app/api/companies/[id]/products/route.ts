import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, props: RouteParams) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;
    const params = await props.params;
    const companyId = parseInt(params.id, 10);

    if (isNaN(companyId)) {
      return NextResponse.json({ error: "ID de empresa inválido." }, { status: 400 });
    }

    // Valida se a empresa pertence ao usuário
    const company = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { id: true, usuario_id: true, nome_fantasia: true },
    });

    if (!company || company.usuario_id !== userId) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode")?.trim();

    // Se for lookup direto por código de barras (usado para auto-preencher preço na contagem)
    if (barcode) {
      const product = await prisma.empresaProduto.findUnique({
        where: {
          empresa_id_codigo_barras: {
            empresa_id: companyId,
            codigo_barras: barcode,
          },
        },
        include: {
          historico_precos: {
            orderBy: { data_registro: "desc" },
            take: 10,
          },
        },
      });

      return NextResponse.json({ product: product || null });
    }

    // Listagem geral do catálogo da empresa
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const skip = (page - 1) * limit;
    const query = searchParams.get("q")?.trim();

    const where: any = { empresa_id: companyId };
    if (query) {
      where.OR = [
        { descricao: { contains: query, mode: "insensitive" } },
        { codigo_barras: { contains: query, mode: "insensitive" } },
        { codigo_produto: { contains: query, mode: "insensitive" } },
        { ncm: { contains: query, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.empresaProduto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { data_ultimo_inventario: "desc" },
        include: {
          historico_precos: {
            orderBy: { data_registro: "desc" },
            take: 3,
          },
        },
      }),
      prisma.empresaProduto.count({ where }),
    ]);

    return NextResponse.json({
      company: {
        id: company.id,
        nome_fantasia: company.nome_fantasia,
      },
      products: products.map((p) => ({
        id: p.id,
        codigo_barras: p.codigo_barras,
        codigo_produto: p.codigo_produto,
        descricao: p.descricao,
        ncm: p.ncm,
        categoria: p.categoria,
        ultimo_preco: p.ultimo_preco ? Number(p.ultimo_preco) : null,
        data_ultimo_inventario: p.data_ultimo_inventario.toISOString(),
        historico_precos: p.historico_precos.map((h) => ({
          id: h.id,
          preco: Number(h.preco),
          data_registro: h.data_registro.toISOString(),
          contagem_id: h.contagem_id,
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
