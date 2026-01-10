// app/api/sessions/[sessionId]/report/route.ts
/**
 * Rota para Gerar Relatório Final da Sessão.
 * (Migrada de /inventory/[userId]/session/... para /sessions/...)
 * * Responsabilidade:
 * 1. Calcular totais separando Loja/Estoque.
 * 2. Retornar dados consolidados.
 * * Segurança: Validação via Token JWT.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth"; // Mudança: getAuthPayload
import { handleApiError } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } } // userId removido
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // 1. Segurança via Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Buscar e Validar Dono
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      include: {
        _count: { select: { participantes: true } },
      },
    });

    if (!sessao || sessao.anfitriao_id !== userId) {
      return NextResponse.json(
        { error: "Sessão não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // 3. Buscar Catálogo
    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
    });

    // 4. Buscar Contagens Agrupadas (Barra + Local)
    const movimentos = await prisma.movimento.groupBy({
      by: ["codigo_barras", "tipo_local"],
      where: { sessao_id: sessionId },
      _sum: { quantidade: true },
    });

    // 5. Consolidar (Map)
    const mapaContagem = new Map<string, { loja: number; estoque: number }>();

    movimentos.forEach((m) => {
      if (m.codigo_barras) {
        const atual = mapaContagem.get(m.codigo_barras) || {
          loja: 0,
          estoque: 0,
        };
        const qtdDecimal = m._sum?.quantidade;
        const qtd = qtdDecimal ? qtdDecimal.toNumber() : 0;

        if (m.tipo_local === "ESTOQUE") {
          atual.estoque += qtd;
        } else {
          atual.loja += qtd;
        }

        mapaContagem.set(m.codigo_barras, atual);
      }
    });

    let totalProdutos = 0;
    let totalContados = 0;
    let totalFaltantes = 0;
    const discrepancias = [];

    // Cruzar Catálogo x Contagem
    for (const prod of produtosSessao) {
      totalProdutos++;
      const codigo = prod.codigo_barras || prod.codigo_produto;
      const dadosContagem = mapaContagem.get(codigo) || { loja: 0, estoque: 0 };

      const totalItem = dadosContagem.loja + dadosContagem.estoque;

      if (totalItem > 0) totalContados++;
      else totalFaltantes++;

      const saldoSistemaNum = prod.saldo_sistema
        ? prod.saldo_sistema.toNumber()
        : 0;

      const diferenca = totalItem - saldoSistemaNum;

      if (totalItem > 0 || diferenca !== 0) {
        discrepancias.push({
          codigo_produto: prod.codigo_produto,
          descricao: prod.descricao,
          saldo_sistema: saldoSistemaNum,
          saldo_contado: totalItem,
          saldo_loja: dadosContagem.loja,
          saldo_estoque: dadosContagem.estoque,
          diferenca: diferenca,
        });
      }

      if (codigo) mapaContagem.delete(codigo);
    }

    // Processar Sobras
    for (const [codigo, dados] of mapaContagem.entries()) {
      totalContados++;
      const totalItem = dados.loja + dados.estoque;

      discrepancias.push({
        codigo_produto: "DESCONHECIDO",
        descricao: `Item não cadastrado (${codigo})`,
        saldo_sistema: 0,
        saldo_contado: totalItem,
        saldo_loja: dados.loja,
        saldo_estoque: dados.estoque,
        diferenca: totalItem,
      });
    }

    // Calcular Duração
    const inicio = new Date(sessao.criado_em).getTime();
    const fim = sessao.finalizado_em
      ? new Date(sessao.finalizado_em).getTime()
      : Date.now();
    const diffMs = fim - inicio;
    const diffMins = Math.floor(diffMs / 60000);
    const duracao = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;

    return NextResponse.json({
      total_produtos: totalProdutos,
      total_contados: totalContados,
      total_faltantes: totalFaltantes,
      discrepancias: discrepancias.sort(
        (a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)
      ),
      participantes: sessao._count.participantes,
      duracao: duracao,
      data_finalizacao: sessao.finalizado_em
        ? new Date(sessao.finalizado_em).toLocaleString("pt-BR")
        : "Agora",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
