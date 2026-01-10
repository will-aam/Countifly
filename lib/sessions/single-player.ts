// lib/sessions/single-player.ts
"use server";

import { prisma } from "@/lib/prisma";
import { SessaoModo } from "@prisma/client";

/**
 * Garante que o usuário tenha uma Sessão INDIVIDUAL ABERTA
 * e um Participante vinculado a ele nessa sessão.
 *
 * Retorna os IDs para serem usados pelo frontend / APIs de movimentos.
 */
export async function ensureSinglePlayerSession(usuarioId: number): Promise<{
  sessaoId: number;
  participanteId: number;
}> {
  if (!usuarioId) {
    throw new Error("usuarioId é obrigatório em ensureSinglePlayerSession.");
  }

  // 1) Procura Sessão INDIVIDUAL ABERTA onde o usuário é anfitrião
  let sessao = await prisma.sessao.findFirst({
    where: {
      anfitriao_id: usuarioId,
      modo: SessaoModo.INDIVIDUAL,
      status: "ABERTA",
    },
  });

  // 2) Se não existir, cria uma nova
  if (!sessao) {
    // Gera um código de acesso "fixo" amigável para o estoque pessoal
    const codigoAcesso = `USER-${usuarioId}`;

    sessao = await prisma.sessao.create({
      data: {
        anfitriao_id: usuarioId,
        codigo_acesso: codigoAcesso,
        nome: "Estoque Pessoal",
        modo: SessaoModo.INDIVIDUAL,
        status: "ABERTA",
      },
    });
  }

  // 3) Procura Participante vinculado a este usuário nessa sessão
  let participante = await prisma.participante.findFirst({
    where: {
      sessao_id: sessao.id,
      usuario_id: usuarioId,
    },
  });

  // 4) Se não existir, cria um (nome padrão: "Eu")
  if (!participante) {
    participante = await prisma.participante.create({
      data: {
        sessao_id: sessao.id,
        usuario_id: usuarioId,
        nome: "Eu",
        status: "ATIVO",
      },
    });
  }

  return {
    sessaoId: sessao.id,
    participanteId: participante.id,
  };
}
