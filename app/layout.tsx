// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0044ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
export const metadata: Metadata = {
  title: "Countifly - Sistema de Inventário",
  description: "Sistema de contagem de estoque",
  manifest: "/manifest.json?v=4",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Countifly",
  },
  formatDetection: {
    telephone: false,
  },
};
// Mantém dinâmico se você precisa (por causa de cookies/tema/etc.)
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Preconnect para o CDN de ícones — elimina latência de DNS/TLS na primeira requisição */}
        <link rel="preconnect" href="https://img.icons8.com" />
        <link rel="dns-prefetch" href="https://img.icons8.com" />
      </head>
      <body className={inter.className}>
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(() => {
                if (!("serviceWorker" in navigator)) return;
                const key = "countifly-dev-sw-cleanup:" + location.origin;
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  const stale = registrations.filter((registration) =>
                    [registration.active, registration.waiting, registration.installing]
                      .filter(Boolean)
                      .some((worker) => {
                        try {
                          const scriptUrl = new URL(worker.scriptURL);
                          return scriptUrl.origin === location.origin && scriptUrl.pathname.endsWith("/sw.js");
                        } catch { return false; }
                      })
                  );
                  if (!stale.length) return;
                  Promise.all(stale.map((registration) => registration.unregister())).then(() => {
                    if (sessionStorage.getItem(key) !== "done") {
                      sessionStorage.setItem(key, "done");
                      location.reload();
                    }
                  });
                }).catch((error) => console.warn("Falha ao remover service worker local antigo:", error));
              })();`,
            }}
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            {children}
            <InstallPrompt />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
