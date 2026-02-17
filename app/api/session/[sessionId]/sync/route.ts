// app/api/session/[sessionId]/sync/route.ts
/**
 * Rota de API para sincronização de movimentos em uma sessão específica.
 * Responsabilidade:
 * 1. POST: Receber movimentos do participante e salvar no banco.
 * 2. VALIDAR payload completo (schema, limites, tipos).
 * 3. Validar se a sessão está ABERTA antes de aceitar movimentos.
 * Segurança:
 * - Validação de schema com Zod
 * - Limite de 1000 movimentos por request
 * - Validação de tipos e ranges
 * - Proteção contra valores negativos
 * - Validação de timestamps
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusSessao } from "@prisma/client";
import { z } from "zod";

// ✅ SCHEMA DE VALIDAÇÃO COM ZOD
const MovementSchema = z.object({
  id: z.string().uuid("ID deve ser um UUID válido"),
  codigo_barras: z
    .string()
    .min(1, "Código de barras não pode ser vazio")
    .max(100, "Código de barras muito longo")
    .regex(/^[0-9A-Za-z\-_]+$/, "Código de barras contém caracteres inválidos"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(-10000, "Quantidade inválida (muito negativa)")
    .max(100000, "Quantidade inválida (muito alta)"),
  timestamp: z
    .number()
    .int("Timestamp deve ser um número inteiro")
    .min(1609459200000, "Timestamp inválido (antes de 2021)")
    .max(Date.now() + 86400000, "Timestamp inválido (futuro)"), // +24h tolerância
  tipo_local: z.enum(["LOJA", "ESTOQUE"], {
    message: "tipo_local deve ser LOJA ou ESTOQUE",
  }),
});

const SyncPayloadSchema = z.object({
  participantId: z.number().int().positive("participantId deve ser positivo"),
  movements: z
    .array(MovementSchema)
    .min(1, "Nenhum movimento enviado")
    .max(1000, "Máximo de 1000 movimentos por request"), // ✅ LIMITE
});

// ✅ Tipo inferido do schema
type SyncPayload = z.infer<typeof SyncPayloadSchema>;

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } },
) {
  try {
    const sessionId = parseInt(params.sessionId, 10);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "ID de sessão inválido." },
        { status: 400 },
      );
    }

    // ✅ 1. PARSE E VALIDAÇÃO DO PAYLOAD
    const rawBody = await request.json();

    let payload: SyncPayload;
    try {
      payload = SyncPayloadSchema.parse(rawBody);
    } catch (error: any) {
      // ✅ Retorna erros de validação detalhados
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Payload inválido",
            details: error.issues.map((e: z.ZodIssue) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // ✅ 2. VERIFICAR STATUS DA SESSÃO
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    if (sessao.status !== StatusSessao.ABERTA) {
      return NextResponse.json(
        {
          error: "A sessão foi encerrada. Novos envios bloqueados.",
          statusCode: 409,
          sessionStatus: sessao.status,
        },
        { status: 409 },
      );
    }

    // ✅ 3. NORMALIZAR E INSERIR MOVIMENTOS
    const normalizedMovements = payload.movements.map((mov) => ({
      id_movimento_cliente: mov.id,
      sessao_id: sessionId,
      participante_id: payload.participantId,
      codigo_barras: mov.codigo_barras.trim(), // ✅ Remove espaços
      quantidade: mov.quantidade,
      data_hora: new Date(mov.timestamp), // ✅ Garantido válido pelo Zod
      tipo_local: mov.tipo_local,
    }));

    // ✅ 4. INSERIR NO BANCO (BATCH)
    const result = await prisma.movimento.createMany({
      data: normalizedMovements,
      skipDuplicates: true, // ✅ Idempotência
    });

    // ✅ 5. BUSCAR SALDOS ATUALIZADOS (APENAS DOS CÓDIGOS ENVIADOS)
    const codigosBarras = [
      ...new Set(payload.movements.map((m) => m.codigo_barras)),
    ];

    const saldosAtualizados = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: {
        sessao_id: sessionId,
        codigo_barras: { in: codigosBarras }, // ✅ Otimização: apenas códigos relevantes
      },
      _sum: { quantidade: true },
    });

    const saldosMap = saldosAtualizados.reduce(
      (acc, s) => {
        if (s.codigo_barras && s._sum.quantidade) {
          acc[s.codigo_barras] = s._sum.quantidade.toNumber();
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      success: true,
      inserted: result.count, // ✅ Quantos foram realmente inseridos (deduplica)
      skipped: payload.movements.length - result.count, // ✅ Quantos eram duplicados
      saldos: saldosMap,
    });
  } catch (error: any) {
    console.error("Erro ao sincronizar movimentos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
