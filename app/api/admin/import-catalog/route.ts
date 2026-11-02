import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, ForbiddenError, getAuthPayload } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    const user = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: { tipo: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
    }
    if (user.tipo !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem importar o catálogo mestre.");
    }

    const { items } = await request.json();

    // O catálogo mestre continua associado ao usuário de sistema.
    const userId = 1;

    const results = [];

    // Processamos item por item (poderia ser createMany, mas upsert é mais seguro para atualizações)
    for (const item of items) {
      // Tratamento de campos vazios
      const precoTratado = item.preco
        ? parseFloat(item.preco.replace(",", "."))
        : 0;
      const marcaTratada =
        item.marca && item.marca.trim() !== "" ? item.marca : null;
      const subcategoriaTratada =
        item.subcategoria && item.subcategoria.trim() !== ""
          ? item.subcategoria
          : null;

      const produto = await prisma.produto.upsert({
        where: {
          codigo_produto_usuario_id: {
            codigo_produto: item.codigo_de_barras,
            usuario_id: userId,
          },
        },
        update: {
          descricao: item.descricao,
          categoria: item.categoria,
          subcategoria: subcategoriaTratada,
          marca: marcaTratada,
          preco: precoTratado,
          tipo_cadastro: "FIXO", // <--- AQUI ESTÁ O PULO DO GATO
        },
        create: {
          codigo_produto: item.codigo_de_barras,
          descricao: item.descricao,
          categoria: item.categoria,
          subcategoria: subcategoriaTratada,
          marca: marcaTratada,
          preco: precoTratado,
          saldo_estoque: 0,
          usuario_id: userId,
          tipo_cadastro: "FIXO", // <--- AQUI TAMBÉM
        },
      });
      results.push(produto);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro na importação:", error);
    return NextResponse.json({ error: "Falha ao importar o catálogo." }, { status: 500 });
  }
}
