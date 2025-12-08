// components/shared/InstallPrompt.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Detectar se é iOS (iPhone/iPad)
    // O iOS não suporta o evento 'beforeinstallprompt', então mostramos instruções manuais.
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 2. Capturar o evento no Android/Desktop
    const handler = (e: any) => {
      // Previne o mini-infobar padrão do navegador
      e.preventDefault();
      // Salva o evento para disparar depois
      setDeferredPrompt(e);
      // Mostra nosso botão personalizado
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Verifica se já está instalado (Standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt nativo de instalação
    deferredPrompt.prompt();

    // Espera a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
      toast({
        title: "Instalando...",
        description: "Obrigado por instalar o Countifly!",
      });
    }
  };

  // Se não for instalável e não for iOS, não renderiza nada
  if (!isVisible && !isIOS) return null;

  // Lógica específica para iOS (Instruções) - Opcional, mas recomendado
  if (isIOS && !isVisible) {
    // No iOS, só mostramos se NÃO estiver rodando como app (standalone)
    // Mas para não poluir, podemos deixar isso para um componente de "Ajuda" separado
    // ou mostrar um toast discreto. Por enquanto, vou focar no botão Android/Desktop.
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 border border-primary/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-sm">Instalar Countifly</p>
            <p className="text-xs opacity-90">Acesse offline e mais rápido</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleInstallClick}
            className="font-semibold shadow-sm"
          >
            Instalar
          </Button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-primary-foreground/70 hover:text-white p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
