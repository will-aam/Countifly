"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para mostrar/ocultar senha
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Helper: aplica regra de "apenas números e máximo 6 caracteres"
  const sanitizeToSixDigits = (value: string) => {
    const onlyDigits = value.replace(/\D/g, ""); // remove tudo que não é número
    return onlyDigits.slice(0, 6); // limita a 6 caracteres
  };

  const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPassword(sanitizeToSixDigits(e.target.value));
  };

  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(sanitizeToSixDigits(e.target.value));
  };

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmNewPassword(sanitizeToSixDigits(e.target.value));
  };

  const handleSubmit = async () => {
    // Validação básica de preenchimento
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    // Regra: exatamente 6 dígitos numéricos
    const isCurrentValid = /^\d{6}$/.test(currentPassword);
    const isNewValid = /^\d{6}$/.test(newPassword);
    const isConfirmValid = /^\d{6}$/.test(confirmNewPassword);

    if (!isCurrentValid || !isNewValid || !isConfirmValid) {
      toast({
        title: "Formato de senha inválido.",
        description: "As senhas devem ter exatamente 6 números.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "As senhas não conferem.",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao alterar senha.");
      }

      toast({ title: "Senha alterada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Não foi possível alterar a senha.",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => !isLoading && onOpenChange(open)}
    >
      {/* Modal mais compacto e amigável para mobile */}
      <DialogContent className="w-[90vw] max-w-sm p-4 sm:p-5 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Alterar senha
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Sua senha deve ter exatamente 6 dígitos numéricos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Senha atual */}
          <div className="space-y-1">
            <Label htmlFor="current-password" className="text-xs">
              Senha atual
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={currentPassword}
                onChange={handleCurrentChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-9 text-base"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowCurrent((prev) => !prev)}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div className="space-y-1">
            <Label htmlFor="new-password" className="text-xs">
              Nova senha
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={newPassword}
                onChange={handleNewChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-9 text-base"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowNew((prev) => !prev)}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar nova senha */}
          <div className="space-y-1">
            <Label htmlFor="confirm-new-password" className="text-xs">
              Confirmar nova senha
            </Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirm ? "text" : "password"}
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={confirmNewPassword}
                onChange={handleConfirmChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-9 text-base"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            className="w-full mt-1 h-9 text-sm"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Alterando..." : "Salvar nova senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
