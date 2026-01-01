// lib/auth-client.ts
export type PreferredMode =
  | "dashboard"
  | "count_import"
  | "count_scan"
  | "audit"
  | "team";

interface AuthResponseData {
  success?: boolean;
  userId?: number;
  preferredMode?: PreferredMode | null;
  error?: string;
}

/**
 * Aplica os efeitos colaterais de um login de gestor:
 * - valida response/data
 * - grava currentUserId
 * - limpa currentSession
 * - atualiza preferredMode no sessionStorage
 *
 * Lança erro se a autenticação falhar.
 */
export async function applyManagerLoginSession(
  response: Response
): Promise<AuthResponseData> {
  const data = (await response.json()) as AuthResponseData;

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Erro ao autenticar");
  }

  if (data.userId) {
    sessionStorage.setItem("currentUserId", String(data.userId));
    sessionStorage.removeItem("currentSession");
  }

  const preferredMode = data.preferredMode ?? null;

  if (preferredMode) {
    sessionStorage.setItem("preferredMode", preferredMode);
  } else {
    sessionStorage.removeItem("preferredMode");
  }

  return data;
}
