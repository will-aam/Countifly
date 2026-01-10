// app/api/inventory/route.ts
/**
 * Rota de API para gerenciar o inventário do USUÁRIO LOGADO.
 * * Responsabilidade:
 * 1. GET: Buscar o catálogo do usuário autenticado.
 * 2. DELETE: Limpar TODOS os dados de contagem do usuário (Borracha).
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const toNum = (val: any) => {
  if (!val) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

// --- GET (Buscar Catálogo - Mantido igual) ---
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const userBarCodes = await prisma.codigoBarras.findMany({
      where: { usuario_id: userId },
      include: { produto: true },
    });

    const userProducts = userBarCodes
      .map((bc) => {
        if (!bc.produto) return null;
        return {
          ...bc.produto,
          saldo_estoque: toNum(bc.produto.saldo_estoque),
        };
      })
      .filter((p) => p !== null);

    return NextResponse.json({
      products: userProducts,
      barCodes: userBarCodes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// --- DELETE (A CORREÇÃO ESTÁ AQUI) ---
export async function DELETE(request: NextRequest) {
  try {
    // 1. Identifica o usuário
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Descobre quais são as sessões desse usuário (para poder limpar os movimentos delas)
    const sessoesUsuario = await prisma.sessao.findMany({
      where: { anfitriao_id: userId },
      select: { id: true },
    });

    const idsSessoes = sessoesUsuario.map((s) => s.id);

    // 3. Transação de Limpeza
    await prisma.$transaction([
      // A. Limpa os MOVIMENTOS (Aqui é onde os bipes reais estão guardados agora)
      prisma.movimento.deleteMany({
        where: {
          sessao_id: { in: idsSessoes },
        },
      }),

      // B. Limpa tabelas legadas (para garantir que não sobre lixo antigo)
      prisma.itemContado.deleteMany({
        where: { contagem: { usuario_id: userId } },
      }),
      prisma.contagem.deleteMany({
        where: { usuario_id: userId },
      }),

      // C. Opcional: Se "Limpar Tudo" também deve remover os PRODUTOS importados (zera o catálogo),
      // descomente as linhas abaixo.
      // Se a ideia é só zerar a CONTAGEM e manter o CADASTRO, deixe comentado ou removido.
      /*
      prisma.produtoSessao.deleteMany({
        where: { sessao_id: { in: idsSessoes } }
      }),
      prisma.codigoBarras.deleteMany({
        where: { usuario_id: userId },
      }),
      prisma.produto.deleteMany({
        where: { usuario_id: userId },
      }),
      */
    ]);

    return NextResponse.json({
      success: true,
      message: "Contagens excluídas com sucesso. O catálogo foi mantido.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
