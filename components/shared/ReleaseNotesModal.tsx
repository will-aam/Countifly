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
import { PartyPopper } from "lucide-react";

const CURRENT_VERSION = "1.2";

export function ReleaseNotesModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem("last_seen_version");
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("last_seen_version", CURRENT_VERSION);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* h-[80vh] para caber bem no mobile; flex-col para separar header / body / footer */}
      <DialogContent className="sm:max-w-md h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <PartyPopper className="h-6 w-6" />
            Chegou a Versão {CURRENT_VERSION}!
          </DialogTitle>
          <DialogDescription>
            Veja o que preparamos para facilitar seu trabalho.
          </DialogDescription>
        </DialogHeader>

        {/* Área rolável */}
        <div className="px-6 pb-6 pt-2 space-y-4 text-sm text-muted-foreground overflow-y-auto">
          <p>
            <strong>🚀 Funciona sem Internet:</strong> Caiu o Wi-Fi no estoque?
            Sem problemas! Continue contando normalmente. O sistema guarda tudo
            e envia sozinho assim que a internet voltar.
          </p>
          <p>
            <strong>📱 Instale como Aplicativo:</strong> Agora você pode baixar
            o Countifly no seu celular! Ele vai ficar na sua tela inicial, em
            tela cheia e muito mais prático de usar.
          </p>
          <p>
            <strong>🔍 Que produto é esse?</strong> Ficou na dúvida ao ler um
            código? É só tocar nele que a gente te mostra a foto do produto no
            Google Imagens na hora.
          </p>

          <p>
            <strong>🔢 Importação sem Erros:</strong> Resolvemos a confusão
            entre ponto e vírgula na hora de importar produtos. Agora o sistema
            respeita o formato do seu arquivo original, garantindo que os saldos
            e quantidades decimais fiquem exatamente como devem ser.
          </p>
          <p>
            <strong>✨ Nomes Longos:</strong> Produtos com nomes muito grandes
            agora deslizam na tela (igual letreiro de aeroporto) para você
            conseguir ler a descrição completa.
          </p>
        </div>

        {/* Rodapé normal (sem sticky) */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button onClick={handleClose} className="w-full">
            Entendi, vamos lá!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
