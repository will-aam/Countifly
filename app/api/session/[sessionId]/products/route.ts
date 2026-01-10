// app/api/session/[sessionId]/products/route.ts
/**
 * Rota de API para listar produtos cadastrados em uma sessão específica.
 * Responsabilidade:
 * 1. GET: Retornar a lista de produtos com seus saldos.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // 1. Buscar produtos cadastrados na sessão (com saldo_sistema como Decimal)
    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
    });

    // 2. Calcular o saldo atual (Soma dos movimentos, que agora é Decimal)
    // Agrupamos por código de barras para performance
    const movimentos = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: { sessao_id: sessionId },
      _sum: {
        quantidade: true,
      },
    });

    // Mapa rápido para consulta: CodigoBarras -> Quantidade Total
    // Armazenaremos como número JavaScript puro
    const saldosMap = new Map<string, number>();
    movimentos.forEach((m) => {
      if (m.codigo_barras) {
        // --- CORREÇÃO 1: Converter a soma dos movimentos para número ---
        // O valor m._sum.quantidade é um objeto Decimal e precisa ser convertido.
        const qtd = m._sum.quantidade ? m._sum.quantidade.toNumber() : 0;
        saldosMap.set(m.codigo_barras, qtd);
      }
    });

    // 3. Combinar dados e formatar a resposta final
    const resultado = produtosSessao.map((prod) => {
      // Tenta achar o saldo contado pelo código de barras principal do produto
      const totalContado = saldosMap.get(prod.codigo_barras || "") || 0;

      return {
        codigo_produto: prod.codigo_produto,
        codigo_barras: prod.codigo_barras,
        descricao: prod.descricao,
        // --- CORREÇÃO 2: Converter o saldo do sistema para número ---
        // O valor prod.saldo_sistema também é um objeto Decimal e precisa ser convertido.
        saldo_sistema: prod.saldo_sistema ? prod.saldo_sistema.toNumber() : 0,
        // --- CORREÇÃO 3: Ajustar o tipo de saldo_contado ---
        // O tipo de `saldo_contado` no hook/frontend precisa ser `number | undefined`
        // para refletir que pode não ter sido contado ainda.
        saldo_contado: totalContado,
      };
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Erro ao listar produtos da sessão:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
