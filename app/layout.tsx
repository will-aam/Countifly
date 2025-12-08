// app/layout.tsx
/**
 * Descrição: Layout raiz da aplicação.
 * Responsabilidade: Envolve todas as páginas, fornecendo a estrutura HTML básica,
 * o provedor de tema (para modo claro/escuro) e o componente de notificações (Toaster).
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import "./globals.css";

// --- Configuração de Fonte ---
const inter = Inter({ subsets: ["latin"] });

// --- Metadados da Aplicação ---
// Configurações de SEO e PWA visíveis para o navegador e motores de busca.
export const metadata: Metadata = {
  title: "Countifly - Sistema de Inventário",
  description: "Sistema de contagem de estoque",
  manifest: "/manifest.json?v=2",
};

/**
 * Componente RootLayout.
 * Estrutura o HTML principal da aplicação, incluindo tags head e body.
 * @param children - Componentes filhos que serão renderizados dentro do layout.
 * @returns A estrutura JSX do layout raiz.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Ícones da aplicação para diferentes contextos (favicon, dispositivos Apple). */}
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <InstallPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
