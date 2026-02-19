"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { AuthModal } from "@/components/shared/AuthModal";

type PreferredMode =
  | "dashboard"
  | "count_import"
  | "count_scan"
  | "audit"
  | "team";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ NOVO: Detecta mensagem de sessão encerrada (mantido)
  useEffect(() => {
    const message = sessionStorage.getItem("sessionEndedMessage");

    if (message) {
      toast({
        title: "Sessão Encerrada",
        description: message,
        duration: 8000,
      });

      sessionStorage.removeItem("sessionEndedMessage");
    }
  }, []);

  const redirectAfterLogin = () => {
    const from = searchParams.get("from");

    if (from) {
      router.replace(from);
      return;
    }

    const storedPreferred = sessionStorage.getItem(
      "preferredMode",
    ) as PreferredMode | null;

    if (!storedPreferred || storedPreferred === "dashboard") {
      router.replace("/");
      return;
    }

    switch (storedPreferred) {
      case "count_import":
        router.replace("/count-import");
        break;
      case "count_scan":
        router.replace("/count-import?tab=scan");
        break;
      case "audit":
        router.replace("/audit");
        break;
      case "team":
        router.replace("/team");
        break;
      default:
        router.replace("/");
    }
  };

  return (
    // Renderiza o modal reutilizável e delega ações específicas via callbacks
    <AuthModal
      onUnlock={() => {
        // quando o AuthModal confirmar login de manager, redireciona conforme regras
        redirectAfterLogin();
      }}
      onJoinSession={(data: any) => {
        // quando entrar como colaborador, persistir sessão e ir para participante
        sessionStorage.setItem("currentSession", JSON.stringify(data));
        sessionStorage.removeItem("currentUserId");
        router.replace("/participant");
      }}
    />
  );
}
