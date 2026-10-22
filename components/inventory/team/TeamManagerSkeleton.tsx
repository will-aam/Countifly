import { Skeleton } from "@/components/ui/skeleton";

export function TeamManagerSkeleton() {
  return (
    <main
      role="status"
      aria-label="Carregando módulo de equipe"
      className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-6 sm:pb-8"
    >
      <span className="sr-only">Carregando módulo de equipe...</span>

      <div className="space-y-6">
        <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-3">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="hidden h-9 rounded-md sm:block" />
          <Skeleton className="h-9 rounded-md" />
        </div>

        <div className="mx-auto mt-8 w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>

          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}
