// app/api/global-catalog/route.ts

import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      { error: "Código de barras ausente" },
      { status: 400 },
    );
  }

  // Verifica se a variável de ambiente com o link do Neon está configurada
  if (!process.env.CATALOG_DB_URL) {
    console.error("ERRO: CATALOG_DB_URL não está configurado no .env");
    return NextResponse.json(
      { error: "Banco global não configurado" },
      { status: 500 },
    );
  }

  try {
    // Liga, Pergunta e Desliga na velocidade da luz diretamente no Neon
    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require" });
    const result =
      await sql`SELECT * FROM produtos_globais WHERE codigo_barras = ${barcode} LIMIT 1`;
    await sql.end();

    // Se não encontrou nada no banco
    if (result.length === 0) {
      return NextResponse.json(null);
    }

    // Devolve o produto exatamente como está no banco global
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro na busca direta Neon:", error);
    return NextResponse.json(
      { error: "Erro interno na busca" },
      { status: 500 },
    );
  }
}
