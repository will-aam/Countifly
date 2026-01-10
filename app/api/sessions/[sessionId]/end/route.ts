// app/api/sessions/[sessionId]/end/route.ts
/**
 * Rota para Encerrar uma Sessão de Contagem.
 * (Migrada de /inventory/[userId]/session/... para /sessions/...)
 * * Responsabilidade:
 * 1. Mudar status para FINALIZADA.
 * 2. Calcular inventário final.
 * 3. Salvar no Histórico.
 * * Segurança: Validação via Token JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth"; // Mudança: getAuthPayload
import * as Papa from "papaparse";
import { handleApiError } from "@/lib/api";

const toNum = (val: any) => {
  if (!val) return 0;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } } // Sem userId
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "ID de sessão inválido." },
        { status: 400 }
      );
    }

    // 1. Segurança via Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Buscar e Validar Dono
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

    // 3. Travar Sessão (Bloqueio de Sync)
    await prisma.sessao.update({
      where: { id: sessionId },
      data: {
        status: "FINALIZADA",
        finalizado_em: new Date(),
      },
    });

    // 4. Coletar Dados (Estáveis)
    const produtosSessao = await prisma.produtoSessao.findMany({
      where: { sessao_id: sessionId },
    });

    const contagens = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: { sessao_id: sessionId },
      _sum: { quantidade: true },
    });

    // 5. Cruzamento de Dados
    const mapaContagem = new Map<string, number>();
    contagens.forEach((c) => {
      if (c.codigo_barras) {
        mapaContagem.set(c.codigo_barras, toNum(c._sum.quantidade));
      }
    });

    const relatorioFinal = produtosSessao.map((prod) => {
      const codigo = prod.codigo_barras || prod.codigo_produto;
      const qtdContada = mapaContagem.get(codigo) || 0;
      const saldoSistemaNum = toNum(prod.saldo_sistema);
      const diferenca = qtdContada - saldoSistemaNum;

      if (codigo) mapaContagem.delete(codigo);

      return {
        codigo_barras: codigo,
        codigo_produto: prod.codigo_produto,
        descricao: prod.descricao,
        saldo_sistema: saldoSistemaNum,
        contagem: qtdContada,
        diferenca: diferenca,
      };
    });

    // Itens Sobras (Não cadastrados na sessão)
    for (const [codigo, qtd] of mapaContagem.entries()) {
      relatorioFinal.push({
        codigo_barras: codigo,
        codigo_produto: "DESCONHECIDO",
        descricao: `Item não cadastrado (${codigo})`,
        saldo_sistema: 0,
        contagem: qtd,
        diferenca: qtd,
      });
    }

    // 6. Gerar CSV e Histórico
    const csvContent = Papa.unparse(relatorioFinal, {
      header: true,
      delimiter: ";",
    });

    const nomeArquivo = `${sessao.nome.replace(/\s+/g, "_")}_FINAL.csv`;

    await prisma.contagemSalva.create({
      data: {
        usuario_id: userId,
        nome_arquivo: nomeArquivo,
        conteudo_csv: csvContent,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sessão encerrada e relatório salvo no histórico.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
