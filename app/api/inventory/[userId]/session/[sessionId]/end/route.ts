// app/api/inventory/[userId]/session/[sessionId]/end/route.ts
/**
 * Rota para Encerrar uma Sessão de Contagem.
 * Responsabilidade:
 * 1. Mudar status da sessão para FINALIZADA.
 * 2. Calcular o inventário final.
 * 3. Gerar CSV comparativo.
 * 4. Salvar no Histórico.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuth } from "@/lib/auth";
import * as Papa from "papaparse";
import { handleApiError } from "@/lib/api"; // Importamos o Handler Central

// Helper para converter Decimal do Prisma em Number do JS
const toNum = (val: any) => {
  if (!val) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string; sessionId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(userId) || isNaN(sessionId)) {
      return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
    }

    // 1. Segurança (Lança AuthError ou ForbiddenError se falhar)
    await validateAuth(request, userId);

    // 2. Buscar a sessão e verificar propriedade
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
    });

    if (!sessao || sessao.anfitriao_id !== userId) {
      return NextResponse.json(
        { error: "Sessão não encontrada ou acesso negado." },
        { status: 404 }
      );
    }

    if (sessao.status === "FINALIZADA") {
      return NextResponse.json(
        { error: "Esta sessão já foi finalizada." },
        { status: 400 }
      );
    }

    // 3. Coletar Dados para Consolidação

    // A. Produtos do Catálogo (Sistema)
    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
    });

    // B. Movimentos Agrupados (Contagem Real)
    const contagens = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: { sessao_id: sessionId },
      _sum: {
        quantidade: true,
      },
    });

    // 4. Processar e Cruzar Dados
    const mapaContagem = new Map<string, number>();
    contagens.forEach((c) => {
      if (c.codigo_barras) {
        // CORREÇÃO 1: Converter Decimal para Number antes de salvar no Map
        mapaContagem.set(c.codigo_barras, toNum(c._sum.quantidade));
      }
    });

    // Lista final combinada
    const relatorioFinal = produtosSessao.map((prod) => {
      const codigo = prod.codigo_barras || prod.codigo_produto;
      const qtdContada = mapaContagem.get(codigo) || 0;

      // CORREÇÃO 2: Converter saldo_sistema para Number antes da subtração
      const saldoSistemaNum = toNum(prod.saldo_sistema);
      const diferenca = qtdContada - saldoSistemaNum;

      if (codigo) mapaContagem.delete(codigo);

      return {
        codigo_barras: codigo,
        codigo_produto: prod.codigo_produto,
        descricao: prod.descricao,
        saldo_sistema: saldoSistemaNum, // CORREÇÃO 3: Envia number limpo
        contagem: qtdContada,
        diferenca: diferenca,
      };
    });

    // Adicionar itens que foram contados mas NÃO estavam no catálogo (Sobra/Erro)
    for (const [codigo, qtd] of mapaContagem.entries()) {
      relatorioFinal.push({
        codigo_barras: codigo,
        codigo_produto: "DESCONHECIDO",
        descricao: `Item não cadastrado (${codigo})`,
        saldo_sistema: 0, // Agora 0 é válido porque saldo_sistema acima virou number
        contagem: qtd,
        diferenca: qtd,
      });
    }

    // 5. Gerar CSV
    const csvContent = Papa.unparse(relatorioFinal, {
      header: true,
      delimiter: ";",
    });

    // 6. Transação de Encerramento
    const nomeArquivo = `${sessao.nome.replace(/\s+/g, "_")}_FINAL.csv`;

    await prisma.$transaction([
      prisma.sessao.update({
        where: { id: sessionId },
        data: {
          status: "FINALIZADA",
          finalizado_em: new Date(),
        },
      }),
      prisma.contagemSalva.create({
        data: {
          usuario_id: userId,
          nome_arquivo: nomeArquivo,
          conteudo_csv: csvContent,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Sessão encerrada e relatório salvo no histórico.",
    });
  } catch (error) {
    // Tratamento Centralizado
    return handleApiError(error);
  }
}
