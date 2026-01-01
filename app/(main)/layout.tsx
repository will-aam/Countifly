"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation"; // Hook para verificar a rota atual
import { Navigation } from "@/components/shared/navigation";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname(); // Obtemos a rota atual

  // Detecta se estamos na página de histórico/relatório
  const isReportPage = pathname?.startsWith("/inventory/history/");

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navigation setShowClearDataModal={() => {}} currentMode="single" />

      <main
        ref={mainContainerRef}
        // Aplica a classe apenas se **não** for a página de relatório
        className={
          isReportPage
            ? undefined // Nenhuma classe aplicada no relatório
            : "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-24 sm:pb-8"
        }
      >
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
