// app/(private)/dashboard/components/session-alert-bar.tsx
import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";

interface SessionAlertBarProps {
  session: {
    nome: string;
    codigo_acesso: string;
  };
}

export function SessionAlertBar({ session }: SessionAlertBarProps) {
  return (
    <div className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/60">
      <div className="flex items-center gap-3 min-w-0">
        {/* Live indicator */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <Radio className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-sm font-medium text-blue-900 dark:text-blue-200 truncate">
          Sessão em andamento:{" "}
          <strong className="font-bold">{session.nome}</strong>
          <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
            · Código: {session.codigo_acesso}
          </span>
        </span>
      </div>
      <Link
        href="/team"
        className="flex items-center gap-1 shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
      >
        Entrar na contagem
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
