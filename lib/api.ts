// lib/api.ts
// Essa api.ts serve para funções utilitárias relacionadas a APIs, como tratamento de erros.
import { NextResponse } from "next/server";
import { AppError } from "@/lib/auth"; // Importamos a classe base que criamos no passo anterior

/**
 * Função centralizada para tratamento de erros em Rotas de API.
 * Substitui os blocos try/catch manuais que inspecionam strings.
 * * @param error - O objeto de erro capturado no catch.
 * @returns NextResponse formatada com segurança.
 */
export function handleApiError(error: unknown) {
  // 1. Cenário: Erro Operacional Conhecido (Ex: 401, 403, 400)
  // Se o erro for uma instância da nossa classe, confiamos na mensagem e no status.
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // 2. Cenário: Erro de Sistema / Desconhecido (Ex: Banco fora do ar, Bug de código)
  // SEGURANÇA: Nunca enviamos 'error.message' crua para o cliente aqui, pois pode conter
  // nomes de tabelas, IP do banco ou stack traces.

  // Logamos o erro real no console do servidor para debug
  console.error("🔥 ERRO CRÍTICO NÃO TRATADO:", error);

  // Respondemos com um erro genérico 500
  return NextResponse.json(
    { error: "Erro interno do servidor." },
    { status: 500 }
  );
}
