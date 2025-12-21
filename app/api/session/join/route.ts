// app/api/session/join/route.ts
/**
 * Rota Pública para Colaboradores entrarem em uma Sessão.
 * Responsabilidade:
 * 1. Receber o código da sala e o nome do colaborador.
 * 2. Validar se a sala existe e está ABERTA.
 * 3. Criar o registro do Participante.
 * 4. Retornar os dados necessários para o frontend iniciar a contagem.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_PARTICIPANTS_PER_SESSION = 10;
const MAX_CODE_LENGTH = 10;
const MAX_NAME_LENGTH = 30;

// Função auxiliar para atraso (Tarpit)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    let { code, name } = body;

    // Sanitização
    if (typeof code !== "string") code = "";
    if (typeof name !== "string") name = "";

    // Normalização: Remove espaços e transforma em maiúsculas
    // Isso ajuda a UX: o usuário pode digitar " aBc 12 " que vai funcionar
    code = code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);
    name = name.trim().slice(0, MAX_NAME_LENGTH);

    // Validação básica
    if (!code || code.length < 3) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Nome muito curto." }, { status: 400 });
    }

    // -------------------------------------------------------------
    // BUSCA DA SESSÃO
    // -------------------------------------------------------------
    const sessao = await prisma.sessao.findUnique({
      where: { codigo_acesso: code },
    });

    // 🛡️ SEGURANÇA: TARPITTING (Atraso Artificial)
    // Se a sessão não existe ou não está aberta, esperamos 2 segundos.
    // Isso impede ataques de força bruta rápidos sem punir o usuário real
    // com captchas chatos.
    if (!sessao || sessao.status !== "ABERTA") {
      await delay(2000); // Pausa de 2s

      return NextResponse.json(
        { error: "Sessão não encontrada ou encerrada." },
        { status: 404 }
      );
    }

    // Lógica de Participante (Find or Create)
    let participante = await prisma.participante.findFirst({
      where: { sessao_id: sessao.id, nome: name },
    });

    if (participante) {
      if (participante.status !== "ATIVO") {
        participante = await prisma.participante.update({
          where: { id: participante.id },
          data: { status: "ATIVO" },
        });
      }
    } else {
      const totalAtivos = await prisma.participante.count({
        where: { sessao_id: sessao.id, status: "ATIVO" },
      });

      if (totalAtivos >= MAX_PARTICIPANTS_PER_SESSION) {
        return NextResponse.json({ error: "Sala cheia." }, { status: 429 });
      }

      participante = await prisma.participante.create({
        data: {
          nome: name,
          sessao_id: sessao.id,
          status: "ATIVO",
        },
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessao.id,
        nome: sessao.nome,
        codigo: sessao.codigo_acesso,
      },
      participant: {
        id: participante.id,
        nome: participante.nome,
      },
    });
  } catch (error) {
    console.error("Erro no join:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
