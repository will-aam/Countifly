// app/(main)/team/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TeamManagerView } from "@/components/inventory/team/TeamManagerView";

export const dynamic = "force-dynamic";

export default function TeamPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap do usuário
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const savedUserId = sessionStorage.getItem("currentUserId");
        if (savedUserId) {
          setCurrentUserId(parseInt(savedUserId, 10));
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login?from=/team");
            return;
          }
          throw new Error("Falha ao carregar usuário autenticado.");
        }

        const data = await res.json();
        if (data?.success && data.id) {
          setCurrentUserId(data.id);
          sessionStorage.setItem("currentUserId", String(data.id));
          if (data.preferredMode) {
            sessionStorage.setItem("preferredMode", data.preferredMode);
          }
        } else {
          router.replace("/login?from=/team");
          return;
        }
      } catch (error) {
        console.error("Erro ao inicializar usuário (team):", error);
        router.replace("/login?from=/team");
        return;
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUserId) {
    return null;
  }

  // Removemos a prop onBack pois o botão será removido do layout
  return <TeamManagerView userId={currentUserId} />;
}
