// components/shared/AuthPage.tsx
/**
 * Descrição: View de Autenticação Enterprise (Full Page / Glassmorphism).
 * Responsabilidade: Permitir o login corporativo ou acesso rápido de colaborador.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
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
  Mail,
  Lock,
  Hash,
  User,
} from "lucide-react";
import { applyManagerLoginSession } from "@/lib/auth-client";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { cn } from "@/lib/utils";
import { PresentationCards } from "./PresentationCards";

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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background lg:p-0">
      {/* Background for mobile only */}
      <div className="absolute inset-0 z-0 pointer-events-none lg:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      </div>

      <div className="relative z-10 w-full min-h-screen lg:max-w-none lg:bg-background lg:rounded-none lg:shadow-none lg:border-none flex flex-col lg:flex-row lg:h-screen">

        {/* Left Side (Form) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center sm:max-w-md mx-auto sm:px-6 lg:px-16 xl:px-32 lg:max-w-none animate-in fade-in-0 slide-in-from-bottom-4 duration-500 lg:relative h-full overflow-y-auto bg-transparent lg:bg-background">

          {/* Botão de tema no canto superior direito do formulário */}
          <div className="absolute top-4 right-4 lg:top-8 lg:right-8 xl:right-12 z-50">
            <ThemeToggleButton />
          </div>

          {/* Espaço para logomarca */}
          {/* 
          <div className="hidden lg:flex items-center gap-2 absolute top-8 left-8 xl:left-12">
            <svg
              className="w-6 h-6 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="font-bold text-xl tracking-tight">Countifly</span>
          </div>
          */}

          <div className="flex flex-col w-full min-h-screen sm:min-h-fit justify-center px-6 pb-6 sm:px-8 sm:pt-6 sm:pb-6 sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl bg-card/80 backdrop-blur-2xl lg:bg-transparent lg:border-none lg:shadow-none lg:backdrop-blur-none lg:p-0 transition-all lg:max-w-[420px] mx-auto my-auto">
            <div className="pb-4 space-y-1 lg:text-center lg:pb-5">
              <h1 className="text-center text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent lg:text-foreground lg:bg-none">
                <span className="lg:hidden">Countifly</span>
                <span className="hidden lg:block">Bem-vindo ao Countifly</span>
              </h1>
              <p className="text-center text-sm text-muted-foreground font-medium lg:mt-3 lg:text-base">
                {view === "manager"
                  ? "Comece sua experiência acessando o painel de gestão."
                  : "Ingresse em uma sessão de contagem."}
              </p>
            </div>

            {/* Desktop Manager/Collaborator Toggle */}
            <div className="hidden lg:flex p-1 bg-muted/50 rounded-xl mb-5 w-full border border-border/50">
              <button
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${view === "manager"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
                onClick={() => {
                  setView("manager");
                  setError("");
                }}
              >
                Gestor Corporativo
              </button>
              <button
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${view === "collaborator"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
                onClick={() => {
                  setView("collaborator");
                  setError("");
                }}
              >
                Colaborador
              </button>
            </div>

            <div className="space-y-3 lg:space-y-4">
              {view === "manager" ? (
                <div className="space-y-3 lg:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-foreground/80 flex gap-1 font-medium">
                      Email Corporativo <span className="text-primary hidden lg:inline">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="hidden lg:block absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Digite seu email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-11 lg:pl-10 bg-background/50 lg:bg-background lg:shadow-sm backdrop-blur-sm border-border focus-visible:ring-primary text-sm lg:text-base transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-foreground/80 flex gap-1 font-medium">
                      Senha <span className="text-primary hidden lg:inline">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="hidden lg:block absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-11 pr-10 lg:pl-10 bg-background/50 lg:bg-background lg:shadow-sm backdrop-blur-sm border-border focus-visible:ring-primary text-sm lg:text-base transition-colors"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
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
                <div className="space-y-3 lg:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-2.5">
                    <Label htmlFor="code" className="text-foreground/80 flex gap-1 font-medium">
                      Código da Sessão <span className="text-primary hidden lg:inline">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="hidden lg:block absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="code"
                        value={sessionCode}
                        onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-11 lg:pl-10 uppercase tracking-widest font-mono text-center lg:text-left text-lg lg:text-base bg-background/50 lg:bg-background lg:shadow-sm backdrop-blur-sm border-border focus-visible:ring-primary transition-colors"
                        maxLength={8}
                        placeholder="EX: LOJA-01"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-foreground/80 flex gap-1 font-medium">
                      Seu Nome <span className="text-primary hidden lg:inline">*</span>
                    </Label>
                    <div className="relative">
                      <User className="hidden lg:block absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Ex: Maria Silva"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-11 lg:pl-10 bg-background/50 lg:bg-background lg:shadow-sm backdrop-blur-sm border-border focus-visible:ring-primary text-sm lg:text-base transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium text-center animate-in zoom-in-95 duration-200">
                  {error}
                </div>
              )}

              <div className="pt-2 lg:pt-3">
                <Button
                  onClick={
                    view === "manager" ? handleManagerLogin : handleCollaboratorJoin
                  }
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl font-semibold text-base shadow-md"
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

            {/* Social / Alternative divider */}
            <div className="hidden lg:block relative mt-5 mb-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-background px-4 text-muted-foreground font-medium">Ou continue com</span>
              </div>
            </div>

            {/* Social icons placeholder for desktop */}
            <div className="hidden lg:flex justify-center gap-4 mb-3">
              <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-border/70 hover:bg-muted/50 bg-background shadow-sm transition-all hover:shadow" title="Continuar com Google">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-border/70 hover:bg-muted/50 bg-background shadow-sm transition-all hover:shadow" title="Continuar com Telefone">
                <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
              </Button>
            </div>

            {/* Mobile links and bottom footer */}
            <div className="mt-6 lg:mt-auto lg:pt-6 flex flex-col items-center space-y-3 text-sm text-muted-foreground w-full">
              {view === "manager" ? (
                <>
                  <button
                    onClick={() => {
                      setView("collaborator");
                      setError("");
                    }}
                    className="lg:hidden hover:text-foreground transition-colors flex items-center gap-2 font-medium"
                  >
                    <Users className="h-4 w-4" />
                    Entrar como colaborador de contagem
                  </button>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="lg:hidden">Não possui conta?</span>
                    <a
                      href="https://wa.me/message/A2FDLHU4LTEOM1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 hover:underline font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <span className="hidden lg:inline">Não possui conta? </span>Solicitar acesso <ExternalLink className="h-3 w-3 lg:hidden" />
                    </a>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    setView("manager");
                    setError("");
                  }}
                  className="lg:hidden hover:text-foreground transition-colors flex items-center gap-2 font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o acesso de Gestor
                </button>
              )}

              {/* Desktop Copyright */}
              <div className="hidden lg:flex flex-col items-center justify-center text-xs text-muted-foreground/60 w-full gap-2">
                <span>Copyright &copy; Countifly. Todos os direitos reservados.</span>
                <div className="flex gap-4">
                  <Link href="/terms" className="hover:text-primary transition-colors">Termos & Condições</Link>
                  <span>|</span>
                  <Link href="/privacy" className="hover:text-primary transition-colors">Política de Privacidade</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Presentation - Desktop Only) */}
        <div className="hidden lg:flex w-1/2 bg-zinc-950 border-l border-white/5">
          <div className="w-full h-full relative flex flex-col items-center justify-between py-12 px-8 overflow-hidden text-primary-foreground shadow-2xl">
            {/* Aceternity Grid background effect */}
            <div
              className={cn(
                "absolute inset-0",
                "[background-size:40px_40px]",
                "[background-image:linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)]"
              )}
            />
            {/* Radial gradient for the container to give a faded look */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            <PresentationCards />

            {/* Bottom text */}
            <div className="z-10 text-center space-y-4 max-w-lg mt-auto">

              <h2 className="text-4xl font-bold tracking-tight text-white">Base de Dados Global</h2>
              <p className="text-white/80 text-base leading-relaxed mt-4">
                Com o Countifly, a sua auditoria pode ser feita utilizando nossa base de dados global de produtos, auxiliando significativamente na velocidade e precisão de cada contagem.
              </p>

              {/* Progress dots like the image */}
              <div className="flex gap-2.5 justify-center pt-6 mt-10">
                <div className="w-10 h-1.5 rounded-full bg-white"></div>
                <div className="w-10 h-1.5 rounded-full bg-white/30"></div>
                <div className="w-10 h-1.5 rounded-full bg-white/30"></div>
                <div className="w-10 h-1.5 rounded-full bg-white/30"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
