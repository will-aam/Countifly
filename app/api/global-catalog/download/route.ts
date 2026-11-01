import { NextResponse } from "next/server";
import postgres from "postgres";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;

export async function GET(request: Request) {
  try {
    const { userId } = await getAuthPayload();
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { ativo: true, tipo: true, modulo_livre: true },
    });
    if (!user?.ativo || (user.tipo !== "ADMIN" && !user.modulo_livre)) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    if (!process.env.CATALOG_DB_URL) {
      return NextResponse.json({ error: "Catálogo global indisponível." }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim() || null;
    const subcategory = searchParams.get("subcategory")?.trim() || null;
    const brand = searchParams.get("brand")?.trim() || null;
    const rawPage = Number(searchParams.get("page") || 0);
    const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
    const offset = page * PAGE_SIZE;

    if (!category && !subcategory && !brand) {
      return NextResponse.json(
        { error: "Escolha uma categoria, subcategoria ou marca para baixar." },
        { status: 400 },
      );
    }

    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require", max: 1 });
    try {
      const filters = sql`
        WHERE codigo_barras IS NOT NULL AND BTRIM(codigo_barras) <> ''
          AND (${category}::text IS NULL OR BTRIM(categoria) = ${category})
          AND (${subcategory}::text IS NULL OR BTRIM(subcategoria) = ${subcategory})
          AND (${brand}::text IS NULL OR BTRIM(marca) = ${brand})
      `;
      const [rows, countRows] = await Promise.all([
        sql`
          SELECT id, codigo_barras, descricao, categoria, subcategoria, marca
          FROM produtos_globais
          ${filters}
          ORDER BY id
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS total FROM produtos_globais ${filters}`,
      ]);

      const items = rows.map((row) => ({
        barcode: String(row.codigo_barras),
        product: {
          id: Number(row.id),
          codigo_produto: String(row.id),
          descricao: String(row.descricao || "Produto sem descrição"),
          saldo_estoque: 0,
          price: 0,
          tipo_cadastro: "CATALOGO_GLOBAL",
          categoria: row.categoria ? String(row.categoria) : "Geral",
          subcategoria: row.subcategoria ? String(row.subcategoria) : "",
          marca: row.marca ? String(row.marca) : "",
        },
      }));

      return NextResponse.json({
        items,
        page,
        pageSize: PAGE_SIZE,
        total: Number(countRows[0]?.total || 0),
        hasMore: offset + rows.length < Number(countRows[0]?.total || 0),
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("Erro ao baixar filtro do catálogo global:", error);
    return NextResponse.json({ error: "Não foi possível baixar os produtos selecionados." }, { status: 500 });
  }
}
