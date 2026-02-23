// components/inventory/ConfigTab.tsx
"use client";

interface ConfigTabProps {
  userId: number | null;
}

export function ConfigTab({ userId }: ConfigTabProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
      <h2 className="text-xl font-semibold text-muted-foreground">Olá!</h2>
      <p className="text-sm text-muted-foreground/60 mt-2">
        Novas configurações em breve.
      </p>
    </div>
  );
}
