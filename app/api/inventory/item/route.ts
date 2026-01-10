// app/api/inventory/item/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json(
        { error: "Código de barras obrigatório" },
        { status: 400 }
      );
    }

    // Deleta todos os movimentos deste usuário para este código de barras
    // Isso efetivamente "zera" e remove o item da contagem
    await prisma.movimento.deleteMany({
      where: {
        // Se estiver usando sessão single player, a API inventory/route.ts limpou por user_id,
        // mas aqui vamos garantir que pegamos a sessão correta ou deletamos por usuário.
        // Assumindo estrutura Single Player baseada no usuário:
        sessao: {
          anfitriao_id: userId,
          status: "ABERTA", // Segurança extra: só deleta de sessões abertas
        },
        codigo_barras: barcode,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    return NextResponse.json(
      { error: "Erro interno ao deletar item" },
      { status: 500 }
    );
  }
}
