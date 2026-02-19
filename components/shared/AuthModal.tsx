// components/shared/AuthModal.tsx
/**
 * Descrição: Modal de Autenticação Enterprise.
 * Responsabilidade: Permitir o login corporativo como ação principal,
 * com links secundários para acesso rápido de colaborador e solicitação de conta.
 */

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface AuthModalProps {
  onUnlock: (userId: number, token: string) => void;
  onJoinSession?: (data: any) => void;
}

type AuthView = "manager" | "collaborator";

export function AuthModal({ onUnlock, onJoinSession }: AuthModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fundo com efeito de Blur e Pulso */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="border shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />

          <CardHeader className="pb-6 space-y-2">
            <CardTitle className="text-center text-3xl font-bold tracking-tight">
              Countifly
            </CardTitle>
            <CardDescription className="text-center text-base">
              {view === "manager"
                ? "Acesse o painel de gestão corporativo"
                : "Ingresse em uma sessão de contagem"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {view === "manager" ? (
              // VISÃO: GESTOR
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // VISÃO: COLABORADOR
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="code">Código da Sessão</Label>
                  <Input
                    id="code"
                    value={sessionCode}
                    onChange={(e) =>
                      setSessionCode(e.target.value.toUpperCase())
                    }
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="uppercase tracking-widest font-mono text-center text-lg h-11"
                    maxLength={8}
                    placeholder="EX: LOJA-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Maria Silva"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 mt-4 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-5 pb-6">
            <Button
              className="w-full h-11 text-base shadow-lg hover:shadow-primary/20 transition-all"
              onClick={
                view === "manager" ? handleManagerLogin : handleCollaboratorJoin
              }
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {view === "manager" ? "Autenticando..." : "Validando..."}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  {view === "manager" ? "Acessar Painel" : "Entrar na Contagem"}
                </>
              )}
            </Button>

            {/* Links de Rodapé */}
            <div className="w-full flex flex-col items-center space-y-4 text-sm text-muted-foreground">
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
                      className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
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
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
