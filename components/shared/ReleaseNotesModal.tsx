// components/shared/ReleaseNotesModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react"; // Ícone festivo

// Defina a versão atual aqui
const CURRENT_VERSION = "1.2";

export function ReleaseNotesModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já viu esta versão específica
    const lastSeenVersion = localStorage.getItem("last_seen_version");

    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    // Salva que o usuário já viu esta versão para não mostrar de novo
    localStorage.setItem("last_seen_version", CURRENT_VERSION);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <PartyPopper className="h-6 w-6" />
            Chegou a Versão {CURRENT_VERSION}!
          </DialogTitle>
          <DialogDescription>
            Temos novidades incríveis para você no Countifly.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 text-sm text-muted-foreground">
          <p>
            <strong>🚀 Modo Offline Blindado:</strong> Agora você pode contar
            estoque sem internet e tudo será sincronizado automaticamente quando
            a conexão voltar.
          </p>
          <p>
            <strong>📱 Instale como App:</strong> Melhoramos a experiência para
            você instalar o Countifly direto na tela inicial do seu celular.
          </p>
          <p>
            <strong>🔍 Link Mágico:</strong> Toque nos códigos de barras para
            ver a foto do produto no Google Imagens.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Entendi, vamos lá!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
