import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // Busca apenas a primeira sessão que seja MULTIPLAYER e esteja ABERTA
    const activeSession = await prisma.sessao.findFirst({
      where: {
        anfitriao_id: userId,
        modo: "MULTIPLAYER",
        status: "ABERTA",
      },
      select: {
        id: true,
        codigo_acesso: true,
        nome: true,
      },
    });

    return NextResponse.json({ success: true, activeSession });
  } catch (error) {
    return handleApiError(error);
  }
}
