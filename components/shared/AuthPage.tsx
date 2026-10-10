// components/shared/AuthPage.tsx
/**
 * Descrição: View de Autenticação Enterprise (Full Page / Glassmorphism).
 * Responsabilidade: Permitir o login corporativo ou acesso rápido de colaborador.
 */

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleIcon from "./GoogleIcon";
import { AuthCarousel } from "./AuthCarousel";
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

interface AuthPageProps {
  onUnlock: (userId: number, token: string) => void;
  onJoinSession?: (data: any) => void;
}

type AuthView = "manager" | "collaborator";

const VIEW_TABS: { id: AuthView; label: string }[] = [
  { id: "manager", label: "Gestor Corporativo" },
  { id: "collaborator", label: "Colaborador" },
];

export function AuthPage({ onUnlock, onJoinSession }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<AuthView>("manager");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [sessionCode, setSessionCode] = useState("");
  const [participantName, setParticipantName] = useState("");

  const switchView = (next: AuthView) => {
    setView(next);
    setError("");
  };

  const handleManagerLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      setError("Informe seu e-mail e sua senha.");
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
      } else {
        // Antes a tela ficava parada sem nenhuma mensagem nesse caminho
        setError("Não foi possível entrar. Confira seus dados e tente novamente.");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollaboratorJoin = async () => {
    if (!sessionCode.trim() || !participantName.trim()) {
      setError("Informe o código da sessão e o seu nome.");
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
      if (!response.ok) throw new Error(data.error || "Erro ao entrar na sessão.");

      if (data.success && onJoinSession) {
        onJoinSession(data);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao entrar na sessão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // <form> + type="submit" no lugar de onKeyPress (obsoleto) em cada input:
  // o Enter funciona sozinho e gerenciadores de senha entendem o formulário.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (view === "manager") handleManagerLogin();
    else handleCollaboratorJoin();
  };

  const inputBase =
    "h-11 bg-background/50 lg:bg-background lg:shadow-sm backdrop-blur-sm border-border focus-visible:ring-primary text-sm lg:text-base transition-colors";

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background lg:p-0">
      {/* Background for mobile only */}
      <div className="pointer-events-none absolute inset-0 z-0 lg:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      </div>

      <div className="relative z-10 flex min-h-dvh w-full flex-col lg:h-dvh lg:max-w-none lg:flex-row lg:rounded-none lg:border-none lg:bg-background lg:shadow-none">

        {/* Left Side (Form) */}
        <div className="mx-auto flex h-full w-full animate-in flex-col justify-center overflow-y-auto bg-transparent fade-in-0 slide-in-from-bottom-4 duration-500 sm:max-w-md sm:px-6 lg:relative lg:w-1/2 lg:max-w-none lg:bg-background lg:px-12 xl:px-24">

          {/* Botão de tema no canto superior direito do formulário */}
          <div className="absolute right-4 top-4 z-50 lg:right-8 lg:top-8 xl:right-12">
            <ThemeToggleButton />
          </div>

          <div className="mx-auto flex min-h-dvh w-full flex-col justify-between bg-card/80 px-6 pb-8 pt-20 backdrop-blur-2xl transition-all sm:my-auto sm:min-h-fit sm:justify-center sm:rounded-3xl sm:border sm:border-border sm:px-8 sm:pb-6 sm:pt-6 sm:shadow-2xl lg:max-w-[420px] lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            
            <div className="flex w-full flex-1 flex-col justify-center">
              <div className="space-y-1 pb-4 lg:pb-5 lg:text-center">
                <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-center text-3xl font-extrabold tracking-tight text-transparent lg:bg-none lg:text-foreground">
                  <span className="lg:hidden">Countifly</span>
                  <span className="hidden lg:block">Bem-vindo ao Countifly</span>
                </h1>
                <p className="hidden lg:block text-center text-sm font-medium text-muted-foreground lg:mt-3 lg:text-base">
                  {view === "manager"
                    ? "Comece sua experiência acessando o painel de gestão."
                    : "Ingresse em uma sessão de contagem."}
                </p>
              </div>

            {/* Desktop Manager/Collaborator Toggle */}
            <div className="mb-5 hidden w-full rounded-xl border border-border/50 bg-muted/50 p-1 lg:flex">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={view === tab.id}
                  onClick={() => switchView(tab.id)}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    view === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3 lg:space-y-4">
              {view === "manager" ? (
                <div className="animate-in space-y-3 fade-in slide-in-from-bottom-2 duration-300 lg:space-y-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="flex gap-1 font-medium text-foreground/80">
                      E-mail corporativo <span className="hidden text-primary lg:inline" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block" />
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className={cn(inputBase, "lg:pl-10")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="flex gap-1 font-medium text-foreground/80">
                      Senha <span className="hidden text-primary lg:inline" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        disabled={isLoading}
                        className={cn(inputBase, "pr-10 lg:pl-10")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in space-y-3 fade-in slide-in-from-bottom-2 duration-300 lg:space-y-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="code" className="flex gap-1 font-medium text-foreground/80">
                      Código da sessão <span className="hidden text-primary lg:inline" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block" />
                      <Input
                        id="code"
                        value={sessionCode}
                        onChange={(e) => setSessionCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        disabled={isLoading}
                        className={cn(inputBase, "text-center font-mono text-lg uppercase tracking-widest lg:pl-10 lg:text-left lg:text-base")}
                        maxLength={8}
                        placeholder="EX: LOJA-01"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="flex gap-1 font-medium text-foreground/80">
                      Seu nome <span className="hidden text-primary lg:inline" aria-hidden="true">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block" />
                      <Input
                        id="name"
                        autoComplete="name"
                        placeholder="Ex: Maria Silva"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        disabled={isLoading}
                        className={cn(inputBase, "lg:pl-10")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="animate-in rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-center text-sm font-medium text-destructive zoom-in-95 duration-200"
                >
                  {error}
                </div>
              )}

              <div className="pt-2 lg:pt-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full rounded-xl text-base font-semibold shadow-md"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {view === "manager" ? "Autenticando..." : "Validando..."}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      {view === "manager" ? "Acessar painel" : "Entrar na contagem"}
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Social / Alternative divider */}
            <div className="relative my-5 hidden lg:block">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-background px-4 font-medium text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            {/* Os botões ainda não têm ação: ficam desativados e marcados "Em breve" em vez de
                parecerem clicáveis e não fazerem nada. Se não forem implementados, remova junto com o divisor. */}
            <div className="mb-3 hidden justify-center gap-4 lg:flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                title="Login com Google: em breve"
                aria-label="Continuar com Google (em breve)"
                className="h-10 w-10 rounded-full border-border/70 bg-background shadow-sm"
              >
                <GoogleIcon size={20} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                title="Login com telefone: em breve"
                aria-label="Continuar com telefone (em breve)"
                className="h-10 w-10 rounded-full border-border/70 bg-background shadow-sm"
              >
                <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
              </Button>
            </div>

            {/* Links alternativos + rodapé */}
            <div className="mt-6 flex w-full flex-col items-center space-y-3 text-sm text-muted-foreground lg:mt-auto lg:pt-6">
              {view === "manager" ? (
                <>
                  <button
                    type="button"
                    onClick={() => switchView("collaborator")}
                    className="flex items-center gap-2 font-medium transition-colors hover:text-foreground lg:hidden"
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
                      className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
                    >
                      <span className="hidden lg:inline">Não possui conta? </span>Solicitar acesso <ExternalLink className="h-3 w-3 lg:hidden" />
                    </a>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => switchView("manager")}
                  className="flex items-center gap-2 font-medium transition-colors hover:text-foreground lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o acesso de gestor
                </button>
              )}

              {/* Copyright + links legais: antes só apareciam no desktop (hidden lg:flex),
                  ou seja, o celular ficava sem acesso a Termos e Privacidade. */}
              <div className="flex w-full flex-col items-center justify-center gap-2 pt-2 text-xs text-muted-foreground/60">
                <span>Copyright &copy; {new Date().getFullYear()} Countifly. Todos os direitos reservados.</span>
                <div className="flex gap-4">
                  <Link href="/terms" className="transition-colors hover:text-primary">Termos e Condições</Link>
                  <span aria-hidden="true">|</span>
                  <Link href="/privacy" className="transition-colors hover:text-primary">Política de Privacidade</Link>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Right Side (Presentation - Desktop Only) */}
        <div className="relative hidden w-1/2 border-l border-white/5 bg-zinc-950 lg:flex">
          <AuthCarousel />
        </div>
      </div>
    </div>
  );
}