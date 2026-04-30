// components/shared/AuthPage.tsx
/**
 * Descrição: View de Autenticação Enterprise (Full Page / Glassmorphism).
 * Responsabilidade: Permitir o login corporativo ou acesso rápido de colaborador.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  Users,
  LogIn,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { applyManagerLoginSession } from "@/lib/auth-client";

interface AuthPageProps {
  onUnlock: (userId: number, token: string) => void;
  onJoinSession?: (data: any) => void;
}

type AuthView = "manager" | "collaborator";

export function AuthPage({ onUnlock, onJoinSession }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<AuthView>("manager");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [sessionCode, setSessionCode] = useState("");
  const [participantName, setParticipantName] = useState("");

  const handleManagerLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      setError("Por favor, insira o acesso e a senha");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha: senha.trim() }),
      });

      const data = await applyManagerLoginSession(response);

      if (data.success && data.userId) {
        onUnlock(data.userId, "");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollaboratorJoin = async () => {
    if (!sessionCode.trim() || !participantName.trim()) {
      setError("Código da sala e seu nome são obrigatórios.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: sessionCode.trim(),
          name: participantName.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao entrar na sala");

      if (data.success && onJoinSession) {
        onJoinSession(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      if (view === "manager") handleManagerLogin();
      else handleCollaboratorJoin();
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      </div>

      <div className="relative z-10 w-full sm:max-w-md sm:px-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col w-full min-h-screen sm:min-h-fit justify-start pt-[12vh] sm:justify-center px-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl bg-card/80 backdrop-blur-2xl transition-all">
          <div className="pb-8 space-y-2">
            <h1 className="text-center text-4xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Countifly
            </h1>
            <p className="text-center text-sm text-muted-foreground font-medium">
              {view === "manager"
                ? "Acesse o painel de gestão corporativo"
                : "Ingresse em uma sessão de contagem"}
            </p>
          </div>

          <div className="space-y-5">
            {view === "manager" ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/80">
                    Email Corporativo
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-12 bg-background/50 backdrop-blur-sm border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/80">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="h-12 pr-10 bg-background/50 backdrop-blur-sm border-border focus-visible:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-foreground/80">
                    Código da Sessão
                  </Label>
                  <Input
                    id="code"
                    value={sessionCode}
                    onChange={(e) =>
                      setSessionCode(e.target.value.toUpperCase())
                    }
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-14 uppercase tracking-widest font-mono text-center text-xl bg-background/50 backdrop-blur-sm border-border focus-visible:ring-primary"
                    maxLength={8}
                    placeholder="EX: LOJA-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground/80">
                    Seu Nome
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: Maria Silva"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-12 bg-background/50 backdrop-blur-sm border-border focus-visible:ring-primary"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium text-center animate-in zoom-in-95 duration-200">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={
                  view === "manager"
                    ? handleManagerLogin
                    : handleCollaboratorJoin
                }
                disabled={isLoading}
                className="w-full h-12 rounded-xl font-semibold text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {view === "manager" ? "Autenticando..." : "Validando..."}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    {view === "manager"
                      ? "Acessar Painel"
                      : "Entrar na Contagem"}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center space-y-6 text-sm text-muted-foreground">
            {view === "manager" ? (
              <>
                <button
                  onClick={() => {
                    setView("collaborator");
                    setError("");
                  }}
                  className="hover:text-foreground transition-colors flex items-center gap-2 font-medium"
                >
                  <Users className="h-4 w-4" />
                  Entrar como colaborador de contagem
                </button>
                <div className="flex items-center gap-1.5 text-xs">
                  <span>Não possui conta?</span>
                  <a
                    href="https://wa.me/message/A2FDLHU4LTEOM1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    Solicitar acesso <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  setView("manager");
                  setError("");
                }}
                className="hover:text-foreground transition-colors flex items-center gap-2 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o acesso de Gestor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
