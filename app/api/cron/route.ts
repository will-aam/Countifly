// app/api/cron/route.ts
/**
 * Rota de API para um CRON Job de manutenção.
 * ATUALIZADO: Focado em limpeza de sessões órfãs e otimização de banco.
 * (A lógica antiga de exclusão total de produtos foi desativada para segurança).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic"; // Garante que a rota não seja cacheada estaticamente

/**
 * Manipula a requisição GET para o CRON Job.
 * Executa tarefas de manutenção e limpeza segura.
 */
export async function GET(request: Request) {
  const headersList = headers();
  const authorization = headersList.get("authorization");

  // Verifica o segredo de autorização do CRON.
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    // --- 1. LÓGICA ANTIGA (DESATIVADA POR SEGURANÇA) ---
    // O código abaixo apagava produtos com mais de 24h. Isso é perigoso para produção.
    // Mantido comentado apenas para referência histórica.
    /*
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await prisma.produto.deleteMany({ where: { created_at: { lt: twentyFourHoursAgo } } });
    await prisma.codigoBarras.deleteMany({ where: { created_at: { lt: twentyFourHoursAgo } } });
    */

    // --- 2. NOVA TAREFA: Fechar Sessões Abandonadas (+30 dias) ---
    // Se uma sessão ficou ABERTA por mais de 30 dias, provavalmente foi esquecida.
    // Vamos finalizá-la para manter a organização.
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sessõesAbandonadas = await prisma.sessao.updateMany({
      where: {
        status: "ABERTA",
        criado_em: {
          lt: trintaDiasAtras,
        },
      },
      data: {
        status: "FINALIZADA",
        finalizado_em: new Date(), // Marca a data do fechamento automático
      },
    });

    // --- 3. NOVA TAREFA: Expurgo de Movimentos Muito Antigos (+180 dias) ---
    // Sessões finalizadas há mais de 6 meses não precisam manter cada "bipe" (movimento) individual.
    // Apagamos os movimentos para economizar espaço, mas mantemos o registro da Sessão e o CSV (ContagemSalva).
    const seisMesesAtras = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Primeiro, identificamos os IDs das sessões antigas
    const sessoesAntigas = await prisma.sessao.findMany({
      where: {
        status: "FINALIZADA",
        finalizado_em: {
          lt: seisMesesAtras,
        },
      },
      select: { id: true },
    });

    const idsSessoesAntigas = sessoesAntigas.map((s) => s.id);

    let movimentosExcluidos = { count: 0 };

    if (idsSessoesAntigas.length > 0) {
      movimentosExcluidos = await prisma.movimento.deleteMany({
        where: {
          sessao_id: {
            in: idsSessoesAntigas,
          },
        },
      });
    }

    // --- LOG E RESPOSTA ---
    console.log(`CRON JOB EXECUTADO:`);
    console.log(`- Sessões abandonadas fechadas: ${sessõesAbandonadas.count}`);
    console.log(
      `- Movimentos antigos expurgados: ${movimentosExcluidos.count}`
    );

    return NextResponse.json({
      message: "Manutenção do sistema concluída com sucesso.",
      stats: {
        sessoes_fechadas: sessõesAbandonadas.count,
        movimentos_limpos: movimentosExcluidos.count,
      },
    });
  } catch (error: any) {
    console.error("Erro CRÍTICO no CRON JOB:", error);
    // Retorna erro 500 mas com JSON para facilitar debug se chamado via API
    return NextResponse.json(
      { error: "Falha interna na execução do Cron.", details: error.message },
      { status: 500 }
    );
  }
}
