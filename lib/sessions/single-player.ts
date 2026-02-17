// lib/sessions/single-player.ts
/**
 * Lógica de Sessão Individual (Single Player).
 * Responsabilidade: Garantir que cada usuário tenha uma sessão individual única e persistente.
 * 1. Verificar se já existe uma sessão INDIVIDUAL ABERTA para o usuário.
 * 2. Se existir, retornar os IDs da sessão e do participante.
 * 3. Se não existir, criar uma nova sessão INDIVIDUAL e um participante vinculado a ela, e retornar os IDs.
 * Segurança: Validação via Token JWT (o usuário só pode acessar sua própria sessão individual).
 */

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
