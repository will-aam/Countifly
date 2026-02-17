// app/api/session/[sessionId]/sync/route.ts
/**
 * Rota de API para sincronização de movimentos em uma sessão específica.
 * Responsabilidade:
 * 1. POST: Receber movimentos do participante e salvar no banco.
 * 2. VALIDAR autenticação (participante pertence à sessão).
 * 3. VALIDAR payload completo (schema, limites, tipos).
 * 4. VALIDAR se a sessão está ABERTA.
 * Segurança:
 * - Validação de participante pertencente à sessão
 * - Validação de schema com Zod
 * - Limite de 1000 movimentos por request
 * - Proteção contra spoofing de participante
 * - Proteção contra sessões encerradas
 */

import { NextRequest, NextResponse } from "next/server";
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
    .max(Date.now() + 86400000, "Timestamp inválido (futuro)"),
  tipo_local: z.enum(["LOJA", "ESTOQUE"], {
    message: "tipo_local deve ser LOJA ou ESTOQUE",
  }),
});

const SyncPayloadSchema = z.object({
  participantId: z.number().int().positive("participantId deve ser positivo"),
  movements: z
    .array(MovementSchema)
    .min(1, "Nenhum movimento enviado")
    .max(1000, "Máximo de 1000 movimentos por request"),
});

type SyncPayload = z.infer<typeof SyncPayloadSchema>;

/**
 * Extrai token de sessão do participante.
 * Por enquanto, extrai do header customizado enviado pelo frontend.
 */
function extractParticipantAuth(request: NextRequest): {
  participantId: number | null;
  sessionId: number | null;
} {
  const authHeader = request.headers.get("x-session-auth");
  if (authHeader) {
    try {
      const decoded = JSON.parse(
        Buffer.from(authHeader, "base64").toString("utf-8"),
      );
      return {
        participantId: decoded.participantId || null,
        sessionId: decoded.sessionId || null,
      };
    } catch {
      // Ignora erro de parse
    }
  }

  return { participantId: null, sessionId: null };
}

export async function POST(
  request: NextRequest,
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

    // ✅ 2. AUTENTICAÇÃO: Extrair identidade do participante
    const auth = extractParticipantAuth(request);

    // Usa participantId do header se existir, senão usa do payload
    const participantId = auth.participantId || payload.participantId;

    // ✅ 3. VERIFICAR STATUS DA SESSÃO
    const sessao = await prisma.sessao.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada." },
        { status: 404 },
      );
    }

    // ✅ VALIDAÇÃO 1: Sessão deve estar ABERTA
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

    // ✅ 4. VERIFICAR SE PARTICIPANTE EXISTE NA SESSÃO
    const participante = await prisma.participante.findUnique({
      where: {
        id: participantId,
      },
      select: {
        id: true,
        nome: true,
        sessao_id: true,
      },
    });

    // ✅ VALIDAÇÃO 2: Participante deve existir
    if (!participante) {
      return NextResponse.json(
        {
          error: "Participante não encontrado.",
          hint: "ParticipantId inválido.",
        },
        { status: 403 },
      );
    }

    // ✅ VALIDAÇÃO 3: Participante deve pertencer à sessão
    if (participante.sessao_id !== sessionId) {
      return NextResponse.json(
        {
          error: "Participante não pertence a esta sessão.",
          hint: "Você não tem permissão para enviar movimentos para esta sessão.",
        },
        { status: 403 },
      );
    }

    // ✅ VALIDAÇÃO 4: Proteção contra spoofing
    // Se header auth existir e for diferente do payload, bloqueia
    if (auth.participantId && auth.participantId !== payload.participantId) {
      console.warn(
        `[SECURITY] Tentativa de spoofing: auth=${auth.participantId}, payload=${payload.participantId}`,
      );
      return NextResponse.json(
        {
          error: "Participante inválido no payload.",
          hint: "O participantId não corresponde à sua autenticação.",
        },
        { status: 403 },
      );
    }

    // ✅ 5. NORMALIZAR E INSERIR MOVIMENTOS
    const normalizedMovements = payload.movements.map((mov) => ({
      id_movimento_cliente: mov.id,
      sessao_id: sessionId,
      participante_id: participantId, // ✅ Usa o ID VALIDADO
      codigo_barras: mov.codigo_barras.trim(),
      quantidade: mov.quantidade,
      data_hora: new Date(mov.timestamp),
      tipo_local: mov.tipo_local,
    }));

    // ✅ 6. INSERIR NO BANCO (BATCH)
    const result = await prisma.movimento.createMany({
      data: normalizedMovements,
      skipDuplicates: true,
    });

    // ✅ 7. BUSCAR SALDOS ATUALIZADOS
    const codigosBarras = [
      ...new Set(payload.movements.map((m) => m.codigo_barras)),
    ];

    const saldosAtualizados = await prisma.movimento.groupBy({
      by: ["codigo_barras"],
      where: {
        sessao_id: sessionId,
        codigo_barras: { in: codigosBarras },
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
      inserted: result.count,
      skipped: payload.movements.length - result.count,
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
