// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";

export const dynamic = "force-dynamic";
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"manager" | "collaborator">(
    "manager"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Manager
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Colaborador
  const [sessionCode, setSessionCode] = useState("");
  const [participantName, setParticipantName] = useState("");

  const redirectAfterLogin = () => {
    const from = searchParams.get("from");
    router.replace(from || "/");
  };

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
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao autenticar");
      }

      // Salva o ID do gestor para ser usado em /audit, /history, /count-import etc.
      if (data.userId) {
        sessionStorage.setItem("currentUserId", String(data.userId));
        sessionStorage.removeItem("currentSession");
      }

      const preferredMode = data.preferredMode ?? null;
      if (preferredMode) {
        sessionStorage.setItem("preferredMode", preferredMode);
      } else {
        sessionStorage.removeItem("preferredMode");
      }

      redirectAfterLogin();
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
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao entrar na sala");
      }

      // Mesma lógica que você já tinha no AuthModal (lado colaborador):
      sessionStorage.setItem("currentSession", JSON.stringify(data));
      sessionStorage.removeItem("currentUserId");

      // Redireciona para rota dedicada do colaborador
      router.replace("/participant");
    } catch (err: any) {
      setError(err.message || "Erro ao entrar na sala");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (activeTab === "manager") {
      handleManagerLogin();
    } else {
      handleCollaboratorJoin();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handlePrimaryAction();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-6">
      {/* Fundo com gradientes, mas sem extrapolar viewport */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-primary/25 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-500/25 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="border shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggleButton />
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "manager" | "collaborator")}
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
              {/* Aba Manager */}
              <TabsContent value="manager" className="space-y-4 mt-0">
                <CardDescription className="text-center mb-4">
                  Acesso administrativo para controle de estoque.
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Acesso</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    autoComplete="email"
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
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword((prev) => !prev)}
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

              {/* Aba Colaborador */}
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
                onClick={handlePrimaryAction}
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
