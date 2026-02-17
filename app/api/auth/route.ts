// app/api/auth/route.ts
/**
 * Rota de API para autenticação do usuário (Login).
 * Responsabilidade:
 * 1. POST: Autenticar usuário e emitir token JWT via cookie seguro.
 * Segurança:
 * 1. Proteção contra enumeração de e-mails (constant-time authentication).
 * 2. Hash dummy executado mesmo quando usuário não existe.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// Constantes de segurança
const JWT_ISSUER = "countifly-system";
const JWT_AUDIENCE = "countifly-users";

// ✅ Hash dummy pré-gerado (simula senha inválida)
// Este hash NUNCA será igual a nenhuma senha real
const DUMMY_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMye/YqVvpUvYWPpVZuJlCpwZlYCp8A9aXG";

export async function POST(request: Request) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Erro de configuração do servidor." },
        { status: 500 },
      );
    }

    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 },
      );
    }

    // ✅ SEMPRE busca o usuário
    const user = await prisma.usuario.findUnique({ where: { email } });

    // ✅ MUDANÇA CRÍTICA: SEMPRE executa bcrypt.compare
    // Se usuário não existe, compara com hash dummy (tempo constante)
    const hashToCompare = user?.senha_hash || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(senha, hashToCompare);

    // ✅ APENAS AGORA verifica se usuário existe E senha está correta
    if (!user || !isPasswordValid) {
      // ⚠️ IMPORTANTE: Mesma mensagem genérica (não revela se e-mail existe)
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    // --- Cria o token JWT ---
    const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
      expiresIn: "1d",
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // --- Define cookie seguro ---
    const cookieStore = cookies();
    cookieStore.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 dia
      path: "/",
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      preferredMode: user.preferred_mode ?? null,
    });
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
