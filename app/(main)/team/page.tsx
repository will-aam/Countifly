// app/(main)/team/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TeamManagerView } from "@/components/inventory/team/TeamManagerView";

export default function TeamPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUserId = sessionStorage.getItem("currentUserId");

    if (!savedUserId) {
      // Se não tiver manager na sessão, manda para login
      router.replace("/login");
      return;
    }

    setCurrentUserId(parseInt(savedUserId, 10));
    setIsLoading(false);
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

  return (
    <TeamManagerView
      userId={currentUserId}
      onBack={() => {
        // Para onde o gestor volta ao sair do modo equipe
        router.replace("/");
      }}
    />
  );
}
