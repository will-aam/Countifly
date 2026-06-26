// app/participant/page.tsx
/**
 * Página para Participantes de uma Sessão de Contagem.
 * Responsabilidade:
 * 1. Exibir dados da sessão (nome, código de acesso, anfitrião).
 * 2. Listar produtos e permitir atualização de contagem.
 * 3. Permitir que o participante saia da sessão.
 * Segurança:
 * - Validação via Token JWT (implementada na API).
 * - Somente participantes ativos podem acessar esta página (verificado no frontend e backend).
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ParticipantView } from "@/components/inventory/team/ParticipantView";

export default function ParticipantPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSession = sessionStorage.getItem("currentSession");

    if (!savedSession) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(savedSession);
      setSessionData(parsed);
    } catch {
      sessionStorage.removeItem("currentSession");
      router.replace("/login");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      // Para colaborador, basta sair da sessão multiplayer
      sessionStorage.removeItem("currentSession");
    } finally {
      router.replace("/login");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  return <ParticipantView sessionData={sessionData} onLogout={handleLogout} />;
}
