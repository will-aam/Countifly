// app/(main)/page.tsx
"use client";

export const dynamic = "force-dynamic";

export default function DashboardPrincipalPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <h1 className="text-4xl font-bold tracking-tight">Olá mundo</h1>
    </div>
  );
}
