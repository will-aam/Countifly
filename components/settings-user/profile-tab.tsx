// components/settings-user/profile-tab.tsx
"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileInfoSectionProps {
  initialDisplayName?: string;
  initialEmail?: string;
}

export function ProfileInfoSection({
  initialDisplayName,
  initialEmail,
}: ProfileInfoSectionProps = {}) {
  const { toast } = useToast();
  const hasInitialData =
    initialDisplayName !== undefined && initialEmail !== undefined;

  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [savedDisplayName, setSavedDisplayName] = useState(
    initialDisplayName ?? "",
  );
  const [email, setEmail] = useState(initialEmail ?? "");
  const [loading, setLoading] = useState(!hasInitialData);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasInitialData) return;

    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();

        if (data.success) {
          const loadedName = data.displayName || "";
          setDisplayName(loadedName);
          setSavedDisplayName(loadedName);
          setEmail(data.email || "");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [hasInitialData]);

  const hasChanges = displayName.trim() !== savedDisplayName.trim();

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasChanges || saving) return;

    setSaving(true);
    setStatusMessage(null);
    try {
      const trimmed = displayName.trim();

      const res = await fetch("/api/user/display-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: trimmed.length > 0 ? trimmed : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const updatedName = data.displayName || "";
        setDisplayName(updatedName);
        setSavedDisplayName(updatedName);
        setStatusMessage("Perfil atualizado.");
        toast({
          title: "Sucesso!",
          description: "Seus dados foram atualizados.",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar");
      }
    } catch (error: any) {
      setStatusMessage(error.message || "Erro ao salvar alterações.");
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="perfil"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 py-6 lg:py-8"
    >
      <div className="lg:col-span-4 min-w-0 space-y-1">
        <h2
          id="settings-profile-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Perfil da conta
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Nome de exibição utilizado no sistema e e-mail vinculado ao seu
          acesso.
        </p>
      </div>

      <div className="lg:col-span-8 min-w-0">
        {loading ? (
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="h-10 w-32 ml-auto" />
          </div>
        ) : (
          <form
            onSubmit={handleSaveProfile}
            aria-labelledby="settings-profile-heading"
            className="rounded-xl border border-border/60 bg-card overflow-hidden"
          >
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="displayName">Nome de exibição</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Como você quer ser chamado?"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (statusMessage) setStatusMessage(null);
                  }}
                  maxLength={100}
                  autoComplete="name"
                  enterKeyHint="done"
                  aria-describedby="displayName-hint"
                  className="min-h-11 text-base sm:text-sm"
                />
                <p
                  id="displayName-hint"
                  className="text-xs text-muted-foreground"
                >
                  Exibido na barra superior e nos relatórios.
                </p>
              </div>

              <div className="space-y-2 min-w-0">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  disabled
                  autoComplete="email"
                  aria-describedby="email-hint"
                  className="min-h-11 text-base sm:text-sm bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
                <p id="email-hint" className="text-xs text-muted-foreground">
                  Identificador da conta. Não pode ser alterado.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-3.5 bg-muted/30 border-t border-border/60">
              <span
                role="status"
                aria-live="polite"
                className="text-xs text-muted-foreground"
              >
                {statusMessage ||
                  (hasChanges ? "Há alterações não salvas." : "")}
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={!hasChanges || saving}
                className="w-full sm:w-auto min-h-10 px-5"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar perfil"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

type PasswordField = "current" | "new" | "confirm";

export function SecurityPasswordSection() {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PasswordField, string>>
  >({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const sanitizeToSixDigits = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 6);
  };

  const clearFieldError = (field: PasswordField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (statusMessage) setStatusMessage(null);
  };

  const handleSavePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: Partial<Record<PasswordField, string>> = {};
    const sixDigitsRegex = /^\d{6}$/;

    if (!currentPassword) {
      errors.current = "Informe a senha atual.";
    } else if (!sixDigitsRegex.test(currentPassword)) {
      errors.current = "A senha deve conter exatamente 6 números.";
    }

    if (!newPassword) {
      errors.new = "Informe a nova senha.";
    } else if (!sixDigitsRegex.test(newPassword)) {
      errors.new = "A nova senha deve conter exatamente 6 números.";
    }

    if (!confirmNewPassword) {
      errors.confirm = "Confirme a nova senha.";
    } else if (!sixDigitsRegex.test(confirmNewPassword)) {
      errors.confirm = "A confirmação deve conter exatamente 6 números.";
    } else if (newPassword && newPassword !== confirmNewPassword) {
      errors.confirm = "A confirmação não coincide com a nova senha.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.current) {
        currentRef.current?.focus();
      } else if (errors.new) {
        newRef.current?.focus();
      } else if (errors.confirm) {
        confirmRef.current?.focus();
      }
      toast({
        title: "Confira os campos da senha.",
        description: "Preencha corretamente as senhas de 6 dígitos numéricos.",
        variant: "destructive",
      });
      return;
    }

    setFieldErrors({});
    setStatusMessage(null);
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
      setStatusMessage("Senha atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setStatusMessage(err.message || "Erro ao alterar senha.");
      toast({
        title: "Não foi possível alterar a senha.",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section
      id="seguranca"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 py-6 lg:py-8"
    >
      <div className="lg:col-span-4 min-w-0 space-y-1">
        <h2
          id="settings-security-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Segurança
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Altere sua senha de acesso composta por 6 dígitos numéricos.
        </p>
      </div>

      <div className="lg:col-span-8 min-w-0">
        <form
          onSubmit={handleSavePassword}
          aria-labelledby="settings-security-heading"
          noValidate
          className="rounded-xl border border-border/60 bg-card overflow-hidden"
        >
          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 sm:col-span-2 sm:max-w-[calc(50%-0.625rem)] min-w-0">
              <Label htmlFor="current-password">Senha atual</Label>
              <div className="relative">
                <Input
                  ref={currentRef}
                  id="current-password"
                  name="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="current-password"
                  enterKeyHint="next"
                  placeholder="000000"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(sanitizeToSixDigits(e.target.value));
                    clearFieldError("current");
                  }}
                  disabled={savingPassword}
                  aria-invalid={Boolean(fieldErrors.current)}
                  aria-describedby={
                    fieldErrors.current ? "current-password-error" : undefined
                  }
                  className="pr-11 min-h-11 text-base sm:text-sm font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={showCurrent}
                  aria-label={showCurrent ? "Ocultar senha atual" : "Mostrar senha atual"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent((prev) => !prev)}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.current && (
                <p
                  id="current-password-error"
                  className="text-xs text-destructive"
                >
                  {fieldErrors.current}
                </p>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  ref={newRef}
                  id="new-password"
                  name="newPassword"
                  type={showNew ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="new-password"
                  enterKeyHint="next"
                  placeholder="000000"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(sanitizeToSixDigits(e.target.value));
                    clearFieldError("new");
                  }}
                  disabled={savingPassword}
                  aria-invalid={Boolean(fieldErrors.new)}
                  aria-describedby={
                    fieldErrors.new
                      ? "new-password-error new-password-hint"
                      : "new-password-hint"
                  }
                  className="pr-11 min-h-11 text-base sm:text-sm font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={showNew}
                  aria-label={showNew ? "Ocultar nova senha" : "Mostrar nova senha"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew((prev) => !prev)}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p
                id="new-password-hint"
                className="text-xs text-muted-foreground"
              >
                Exatamente 6 dígitos numéricos.
              </p>
              {fieldErrors.new && (
                <p id="new-password-error" className="text-xs text-destructive">
                  {fieldErrors.new}
                </p>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  ref={confirmRef}
                  id="confirm-new-password"
                  name="confirmNewPassword"
                  type={showConfirm ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  placeholder="000000"
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(sanitizeToSixDigits(e.target.value));
                    clearFieldError("confirm");
                  }}
                  disabled={savingPassword}
                  aria-invalid={Boolean(fieldErrors.confirm)}
                  aria-describedby={
                    fieldErrors.confirm
                      ? "confirm-password-error"
                      : undefined
                  }
                  className="pr-11 min-h-11 text-base sm:text-sm font-mono tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={showConfirm}
                  aria-label={
                    showConfirm
                      ? "Ocultar confirmação de senha"
                      : "Mostrar confirmação de senha"
                  }
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {fieldErrors.confirm && (
                <p
                  id="confirm-password-error"
                  className="text-xs text-destructive"
                >
                  {fieldErrors.confirm}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-3.5 bg-muted/30 border-t border-border/60">
            <span
              role="status"
              aria-live="polite"
              className="text-xs text-muted-foreground"
            >
              {statusMessage || ""}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={savingPassword}
              className="w-full sm:w-auto min-h-10 px-5"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar senha"
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ProfileTab() {
  return (
    <div className="divide-y divide-border/60">
      <ProfileInfoSection />
      <SecurityPasswordSection />
    </div>
  );
}
