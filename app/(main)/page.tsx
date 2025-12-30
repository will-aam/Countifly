// app/(main)/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Mode = "team" | "free" | "import" | "history";

export default function DashboardPrincipalPage() {
  const router = useRouter();

  useEffect(() => {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.classList.add("opacity-0", "translate-y-4");
    }
  }, []);

  const handleSelection = (mode: Mode) => {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const modes: Record<Mode, string> = {
      team: "Modo Equipe",
      free: "Contagem Livre",
      import: "Modo Importação",
      history: "Histórico de Relatórios",
    };

    toast.textContent = `Acessando ${modes[mode]}...`;
    toast.classList.remove("opacity-0", "translate-y-4");
    toast.classList.add("opacity-100", "translate-y-0");

    if (mode === "free") {
      router.push("/audit");
    } else if (mode === "history") {
      router.push("/history");
    } else if (mode === "import") {
      router.push("/count-import");
    } else if (mode === "team") {
      // futura navegação para modo equipe
    }

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-4");
      toast.classList.remove("opacity-100", "translate-y-0");
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col transition-colors duration-300">
      <main className="flex-1 max-w-7xl mx-auto w-full py-4 sm:py-6 lg:py-8 space-y-10">
        {/* Cards de resumo rápido */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Último Inventário
              </p>
              <p className="text-lg font-bold">Há 2 dias</p>
            </div>
          </div>

          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Itens no Catálogo
              </p>
              <p className="text-lg font-bold">14.280</p>
            </div>
          </div>

          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 009-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Colaboradores
              </p>
              <p className="text-lg font-bold">12 Ativos</p>
            </div>
          </div>

          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Tempo Médio
              </p>
              <p className="text-lg font-bold">45 min</p>
            </div>
          </div>
        </section>

        {/* Seção de Gestão e Indicadores */}
        <section className="pb-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Gestão e Histórico</h3>
              <p className="text-xs text-muted-foreground">
                Analise dados e acompanhe a acuracidade das últimas operações.
              </p>
            </div>
            <div className="h-px bg-border/40 flex-1 ml-6 hidden md:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-border/50 bg-card/40 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                  Acuracidade Média
                </span>
                <span className="text-xs font-bold text-emerald-500">
                  98.4%
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: "98.4%" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center">
                Baseado nos últimos 10 inventários realizados.
              </p>
            </div>

            <div className="hidden md:flex p-6 rounded-2xl border border-dashed border-border/40 bg-card/20 items-center justify-center text-xs text-muted-foreground">
              Em breve: atalhos rápidos para relatórios ou dashboards
              personalizados.
            </div>
          </div>
        </section>
      </main>

      <div
        id="toast"
        className="fixed bottom-16 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-2xl opacity-0 translate-y-4 transition-all duration-300 pointer-events-none text-sm font-bold z-50"
      >
        Carregando...
      </div>
    </div>
  );
}
