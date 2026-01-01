// app/api/user/me/route.ts
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
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      preferredMode: user.preferred_mode,
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
