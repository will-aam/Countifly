import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Conta apenas os produtos que o tipo de cadastro é "fixo"
    const count = await prisma.produto.count({
      where: {
        tipo_cadastro: {
          equals: "fixo",
          mode: "insensitive", // Assim ele conta "fixo", "FIXO", "Fixo"
        },
      },
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Erro ao buscar contagem do catálogo:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
