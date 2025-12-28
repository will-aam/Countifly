// components/shared/AuthModal.tsx
/**
 * Descrição: Modal de Autenticação Híbrido (Anfitrião vs Colaborador).
 * Responsabilidade: Permitir o login tradicional (email/senha) OU
 * o acesso rápido a uma sessão de contagem (código/nome).
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LockKeyhole, Loader2, Eye, EyeOff, Users, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";

interface AuthModalProps {
  onUnlock: (userId: number, token: string) => void;
  onJoinSession?: (data: any) => void;
}

export function AuthModal({ onUnlock, onJoinSession }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("manager");

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

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao autenticar");

      if (data.success && data.userId) {
        // Guarda userId como já é feito pela tela principal (via onUnlock)
        // e também guarda o modo preferido na sessão
        const preferredMode = data.preferredMode ?? null;

        if (preferredMode) {
          // Ex: "dashboard", "count_import", "audit", "team"...
          sessionStorage.setItem("preferredMode", preferredMode);
        } else {
          // Se não tiver preferência salva no banco, limpamos
          sessionStorage.removeItem("preferredMode");
        }

        onUnlock(data.userId, "");
      }
    } catch (err: any) {
      setError(err.message);
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
      if (activeTab === "manager") handleManagerLogin();
      else handleCollaboratorJoin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="border shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggleButton />
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-2xl font-bold mb-2">
                Countifly
              </CardTitle>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="manager"
                  className="flex items-center gap-2"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Acesso
                </TabsTrigger>
                <TabsTrigger
                  value="collaborator"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Colaborador
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              <TabsContent value="manager" className="space-y-4 mt-0">
                <CardDescription className="text-center mb-4">
                  Acesso administrativo para controle de estoque.
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Acesso</Label>
                  <Input
                    id="email"
                    type="email"
                    // placeholder="admin@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
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
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
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
              </TabsContent>

              <TabsContent value="collaborator" className="space-y-4 mt-0">
                <CardDescription className="text-center mb-4">
                  Entre com o código fornecido pelo seu Anfitrião.
                </CardDescription>
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
                    className="uppercase tracking-widest font-mono text-center text-lg"
                    maxLength={8}
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
                  />
                </div>
              </TabsContent>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium animate-in slide-in-from-top-2">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full h-11 text-base shadow-lg hover:shadow-primary/20 transition-all"
                onClick={
                  activeTab === "manager"
                    ? handleManagerLogin
                    : handleCollaboratorJoin
                }
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {activeTab === "manager" ? "Entrando..." : "Validando..."}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    {activeTab === "manager"
                      ? "Acessar Painel"
                      : "Entrar na Contagem"}
                  </>
                )}
              </Button>
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
