// app/components/settings-user/passaword-user.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock } from "lucide-react";

export function PasswordUserSettings() {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Apenas números, máximo 6 dígitos
  const sanitizeToSixDigits = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "");
    return onlyDigits.slice(0, 6);
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
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

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
    <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-4 sm:p-5 space-y-3 shadow-sm">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-4 w-4" />
        </span>
        Alterar senha
      </h2>
      <p className="text-xs text-muted-foreground">
        Defina uma senha numérica de 6 dígitos. Use uma senha que você consiga
        lembrar, mas evite dados óbvios como data de nascimento.
      </p>

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
    </div>
  );
}
