import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth"; // Se quiser garantir que só você use, ou tire isso se estiver rodando local sem login

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    // Pegamos o ID do usuário (ou force um ID fixo, ex: 1, se preferir)
    // const payload = await getAuthPayload();
    // const userId = payload.userId;
    const userId = 1; // <--- FORÇANDO O ID 1 PARA O CATÁLOGO MESTRE

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
  } catch (error: any) {
    console.error("Erro na importação:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
