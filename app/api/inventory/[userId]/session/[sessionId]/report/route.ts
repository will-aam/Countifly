// app/api/inventory/[userId]/session/[sessionId]/report/route.ts
/**
 * Rota para Gerar Relatório Final da Sessão (COM SEPARAÇÃO LOJA/ESTOQUE).
 * Responsabilidade:
 * 1. Calcular totais e discrepâncias (Sistema vs Contagem).
 * 2. Separar contagens de Loja e Estoque.
 * 3. Retornar dados consolidados.
 */

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; sessionId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(userId) || isNaN(sessionId))
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });

    // 1. Segurança
    await validateAuth(request, userId);

    // 2. Buscar a sessão
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      include: {
        _count: { select: { participantes: true } },
      },
    });

    if (!sessao)
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 }
      );

    // 3. Buscar produtos do catálogo
    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
    });

    // 4. Buscar contagens AGRUPADAS POR BARRA E LOCAL
    // (Aqui está o segredo da separação)
    const movimentos = await prisma.movimento.groupBy({
      by: ["codigo_barras", "tipo_local"], // <--- Agrupa também pelo local
      where: { sessao_id: sessionId },
      _sum: { quantidade: true },
    });

    // 5. Consolidar dados em um Mapa Estruturado
    // Chave: codigo_barras -> Valor: { loja: number, estoque: number }
    const mapaContagem = new Map<string, { loja: number; estoque: number }>();

    movimentos.forEach((m) => {
      // O compilador agora sabe que tipo_local existe (após o npx prisma generate)
      // E usamos ?. para evitar erro se _sum vier vazio
      if (m.codigo_barras) {
        const atual = mapaContagem.get(m.codigo_barras) || {
          loja: 0,
          estoque: 0,
        };
        const qtdDecimal = m._sum?.quantidade;
        const qtd = qtdDecimal ? qtdDecimal.toNumber() : 0;

        // Soma no balde correto
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

    // Processar produtos do catálogo
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

      // Adiciona na lista se houver contagem ou diferença
      // (Mesmo que a diferença seja zero, é bom ter no relatório para conferência)
      if (totalItem > 0 || diferenca !== 0) {
        discrepancias.push({
          codigo_produto: prod.codigo_produto,
          descricao: prod.descricao,
          saldo_sistema: saldoSistemaNum,
          saldo_contado: totalItem,
          // --- NOVOS CAMPOS SEPARADOS ---
          saldo_loja: dadosContagem.loja,
          saldo_estoque: dadosContagem.estoque,
          // ------------------------------
          diferenca: diferenca,
        });
      }

      if (codigo) mapaContagem.delete(codigo);
    }

    // Processar sobras (itens não cadastrados)
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

    // Calcular duração
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
      // Ordena por maior diferença (positiva ou negativa)
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
