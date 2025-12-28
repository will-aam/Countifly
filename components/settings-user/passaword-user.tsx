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
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1.5 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
            Alterar senha de acesso
          </h2>
        </div>
        <p className="text-sm text-muted-foreground pl-9">
          Sua senha deve ser um PIN numérico de 6 dígitos.
        </p>
      </div>

      {/* Área do Formulário */}
      <div className="flex flex-col gap-5">
        {/* Senha Atual */}
        <div className="space-y-1.5">
          <Label
            htmlFor="current-password"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            Senha Atual
          </Label>
          <div className="relative group">
            <Input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              placeholder="000000"
              value={currentPassword}
              onChange={handleCurrentChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-11 pr-12 text-sm tracking-widest font-mono tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowCurrent((prev) => !prev)}
              tabIndex={-1} // Evita foco no botão ao tabular pelos campos
            >
              {showCurrent ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Nova Senha */}
        <div className="space-y-1.5">
          <Label
            htmlFor="new-password"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            Nova Senha
          </Label>
          <div className="relative group">
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              placeholder="000000"
              value={newPassword}
              onChange={handleNewChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-11 pr-12 text-sm tracking-widest font-mono tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowNew((prev) => !prev)}
              tabIndex={-1}
            >
              {showNew ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Confirmar Nova Senha */}
        <div className="space-y-1.5">
          <Label
            htmlFor="confirm-new-password"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            Confirmar Nova Senha
          </Label>
          <div className="relative group">
            <Input
              id="confirm-new-password"
              type={showConfirm ? "text" : "password"}
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              placeholder="000000"
              value={confirmNewPassword}
              onChange={handleConfirmChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-11 pr-12 text-sm tracking-widest font-mono tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowConfirm((prev) => !prev)}
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Rodapé com Ação */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
        <Button
          size="default"
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full sm:w-auto h-10 px-8 shadow-sm"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Atualizando...
            </>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </div>
    </div>
  );
}
