// app/api/user/planner-pin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload, AppError, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { fixar_planejador: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      fixarPlanejador: user.fixar_planejador ?? true,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    const body = await request.json();
    const fixarPlanejador =
      typeof body.fixarPlanejador === "boolean" ? body.fixarPlanejador : true;

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { fixar_planejador: fixarPlanejador },
      select: { fixar_planejador: true },
    });

    return NextResponse.json({
      success: true,
      fixarPlanejador: updated.fixar_planejador,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
