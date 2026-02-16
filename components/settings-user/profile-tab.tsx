// components/settings-user/profile-tab.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, User, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileTab() {
  const { toast } = useToast();

  // Estados - Informações Básicas
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados - Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();

        if (data.success) {
          setDisplayName(data.displayName || "");
          setEmail(data.email || "");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handler: Salvar perfil
  // Substituir a função handleSaveProfile por:

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const trimmed = displayName.trim();

      const res = await fetch("/api/user/display-name", {
        // ← Usar rota existente
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: trimmed.length > 0 ? trimmed : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: "Seus dados foram atualizados.",
        });
        setDisplayName(data.displayName || ""); // Atualizar com valor salvo
      } else {
        throw new Error(data.error || "Erro ao salvar");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handler: Salvar senha
  const handleSavePassword = async () => {
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

    setSavingPassword(true);
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
      setSavingPassword(false);
    }
  };

  const sanitizeToSixDigits = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "");
    return onlyDigits.slice(0, 6);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skeleton Coluna 1 */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32 ml-auto" />
            </CardContent>
          </Card>
        </div>

        {/* Skeleton Coluna 2 */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32 ml-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* COLUNA 1: Informações do Perfil */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 mt-1">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Informações do Perfil
            </h2>
            <p className="text-sm text-muted-foreground">
              Atualize seu nome e email
            </p>
          </div>
        </div>

        {/* Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Nome de Exibição */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                placeholder="Como você quer ser chamado?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Exibido em todo o aplicativo
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Não pode ser alterado
              </p>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COLUNA 2: Segurança da Conta */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 mt-1">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Segurança da Conta
            </h2>
            <p className="text-sm text-muted-foreground">
              Altere sua senha (6 dígitos numéricos)
            </p>
          </div>
        </div>

        {/* Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Senha Atual */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  placeholder="000000"
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(sanitizeToSixDigits(e.target.value))
                  }
                  disabled={savingPassword}
                  className="pr-10 font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  tabIndex={-1}
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
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  placeholder="000000"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(sanitizeToSixDigits(e.target.value))
                  }
                  disabled={savingPassword}
                  className="pr-10 font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
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
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar Nova</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirm ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  placeholder="000000"
                  value={confirmNewPassword}
                  onChange={(e) =>
                    setConfirmNewPassword(sanitizeToSixDigits(e.target.value))
                  }
                  disabled={savingPassword}
                  className="pr-10 font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
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

            {/* Botão Salvar Senha */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSavePassword} disabled={savingPassword}>
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Senha"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
