// app/api/user/me/route.ts
// Essa rota serve para obter as informações do usuário autenticado, como ID, email, nome exibido e modo preferido.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AuthError, AppError } from "@/lib/auth";

export async function GET() {
  try {
    const payload = await getAuthPayload(); // usa o authToken do cookie
    const userId = payload.userId;

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        display_name: true,
        preferred_mode: true,
        tipo: true,
        modulo_importacao: true,
        modulo_livre: true,
        modulo_sala: true,
        ativo: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Check if user is active
    if (!user.ativo) {
      return NextResponse.json(
        { success: false, error: "Conta desativada. Entre em contato com o administrador." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      preferredMode: user.preferred_mode,
      tipo: user.tipo,
      modules: {
        importacao: user.modulo_importacao,
        livre: user.modulo_livre,
        sala: user.modulo_sala,
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/user/me:", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode ?? 401 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
