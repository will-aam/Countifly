// app/api/auth/route.ts
/**
 * Rota de API para autenticação do usuário (Login).
 * Responsabilidade:
 * 1. POST: Autenticar usuário e emitir token JWT via cookie seguro.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers"; // Importamos a gestão de cookies do Next.js

// Constantes de segurança (Devem ser iguais na emissão e validação)
// Idealmente, essas constantes viriam de um arquivo de configuração central.
const JWT_ISSUER = "countifly-system";
const JWT_AUDIENCE = "countifly-users";

export async function POST(request: Request) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Erro de configuração do servidor." },
        { status: 500 }
      );
    }

    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 }
      );
    }

    // --- MUDANÇA AQUI: Cria o token (o "crachá") com metadados de segurança ---
    const token = jwt.sign(
      { userId: user.id, email: user.email }, // Payload
      jwtSecret, // Segredo
      {
        expiresIn: "1d",
        algorithm: "HS256", // 1. Define explicitamente o algoritmo
        issuer: JWT_ISSUER, // 2. Define quem emitiu o token
        audience: JWT_AUDIENCE, // 3. Define para quem o token é destinado
      }
    );
    // ---------------------------------------------------------------------

    // Definimos o cookie no navegador. O 'httpOnly: true' impede que o JavaScript leia este cookie.
    const cookieStore = cookies();
    cookieStore.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Em produção (HTTPS), só trafega criptografado
      sameSite: "strict", // Protege contra ataques CSRF
      maxAge: 60 * 60 * 24, // 1 dia em segundos
      path: "/", // Válido em todas as páginas
    });

    // Retornamos sucesso, mas SEM o token no corpo. O navegador já recebeu o cookie.
    return NextResponse.json({
      success: true,
      userId: user.id,
      preferredMode: user.preferred_mode ?? null,
    });
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
