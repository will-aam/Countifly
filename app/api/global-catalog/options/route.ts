import { NextResponse } from "next/server";
import postgres from "postgres";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require", max: 1 });
    try {
      const [categories, subcategories, brands] = await Promise.all([
        sql`SELECT DISTINCT BTRIM(categoria) AS name FROM produtos_globais WHERE categoria IS NOT NULL AND BTRIM(categoria) <> '' ORDER BY name`,
        sql`SELECT DISTINCT BTRIM(subcategoria) AS name FROM produtos_globais WHERE subcategoria IS NOT NULL AND BTRIM(subcategoria) <> '' ORDER BY name`,
        sql`SELECT DISTINCT BTRIM(marca) AS name FROM produtos_globais WHERE marca IS NOT NULL AND BTRIM(marca) <> '' ORDER BY name`,
      ]);

      return NextResponse.json({
        categories: categories.map((item) => String(item.name)),
        subcategories: subcategories.map((item) => String(item.name)),
        brands: brands.map((item) => String(item.name)),
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("Erro ao carregar filtros do catálogo global:", error);
    return NextResponse.json({ error: "Não foi possível carregar as opções do catálogo." }, { status: 500 });
  }
}
