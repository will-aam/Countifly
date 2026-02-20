// components/shared/AuthModal.tsx
/**
 * Descrição: View de Autenticação Enterprise (Full Page / Glassmorphism).
 * Responsabilidade: Permitir o login corporativo ou acesso rápido de colaborador.
 * Design: Fundo minimalista com Magnetic Glow. Botão Gooey Effect integrado.
 */

"use client";

import { useState, useEffect, useRef } from "react";
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
import gsap from "gsap";

interface AuthModalProps {
  onUnlock: (userId: number, token: string) => void;
  onJoinSession?: (data: any) => void;
}

type AuthView = "manager" | "collaborator";

// ============================================================================
// COMPONENTE: GooeyButton (Botão animado com efeito líquido)
// ============================================================================
function GooeyButton({ isLoading, onClick, children }: any) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let btTl: gsap.core.Timeline;

    const ctx = gsap.context(() => {
      // 💡 CORREÇÃO DO TYPESCRIPT: Forçando o tipo para HTMLElement[] (TweenTarget válido)
      const circlesTopLeft = gsap.utils.toArray(
        ".circle.top-left",
      ) as HTMLElement[];
      const circlesBottomRight = gsap.utils.toArray(
        ".circle.bottom-right",
      ) as HTMLElement[];
      const effectButton = container.querySelector(
        ".effect-button",
      ) as HTMLElement;

      btTl = gsap.timeline({ paused: true, timeScale: 2.6 });

      // Animação das bolhas superiores (Esquerda)
      const tl1 = gsap.timeline();
      tl1.set(circlesTopLeft, { x: 0, y: 0, rotation: -45 });
      tl1.to(circlesTopLeft, {
        duration: 1.2,
        x: -25,
        y: -25,
        scaleY: 2,
        ease: "power2.out",
      });
      tl1.to(circlesTopLeft[0], {
        duration: 0.1,
        scale: 0.2,
        x: "+=6",
        y: "-=2",
      });
      tl1.to(
        circlesTopLeft[1],
        { duration: 0.1, scaleX: 1, scaleY: 0.8, x: "-=10", y: "-=7" },
        "-=0.1",
      );
      tl1.to(
        circlesTopLeft[2],
        { duration: 0.1, scale: 0.2, x: "-=15", y: "+=6" },
        "-=0.1",
      );
      tl1.to(circlesTopLeft[0], {
        duration: 1,
        scale: 0,
        x: "-=5",
        y: "-=15",
        opacity: 0,
      });
      tl1.to(
        circlesTopLeft[1],
        {
          duration: 1,
          scaleX: 0.4,
          scaleY: 0.4,
          x: "-=10",
          y: "-=10",
          opacity: 0,
        },
        "-=1",
      );
      tl1.to(
        circlesTopLeft[2],
        { duration: 1, scale: 0, x: "-=15", y: "+=5", opacity: 0 },
        "-=1",
      );

      // Animação das bolhas inferiores (Direita)
      const tl2 = gsap.timeline();
      tl2.set(circlesBottomRight, { x: 0, y: 0, rotation: 45 });
      tl2.to(circlesBottomRight, {
        duration: 1.1,
        x: 30,
        y: 30,
        ease: "power2.out",
      });
      tl2.to(circlesBottomRight[0], {
        duration: 0.1,
        scale: 0.2,
        x: "-=6",
        y: "+=3",
      });
      tl2.to(
        circlesBottomRight[1],
        { duration: 0.1, scale: 0.8, x: "+=7", y: "+=3" },
        "-=0.1",
      );
      tl2.to(
        circlesBottomRight[2],
        { duration: 0.1, scale: 0.2, x: "+=15", y: "-=6" },
        "-=0.2",
      );
      tl2.to(circlesBottomRight[0], {
        duration: 1,
        scale: 0,
        x: "+=5",
        y: "+=15",
        opacity: 0,
      });
      tl2.to(
        circlesBottomRight[1],
        { duration: 1, scale: 0.4, x: "+=7", y: "+=7", opacity: 0 },
        "-=1",
      );
      tl2.to(
        circlesBottomRight[2],
        { duration: 1, scale: 0, x: "+=15", y: "-=5", opacity: 0 },
        "-=1",
      );

      // Combina tudo
      btTl.add(tl1);
      btTl.to(effectButton, { duration: 0.8, scaleY: 1.1 }, 0.1);
      btTl.add(tl2, 0.2);
      btTl.to(
        effectButton,
        { duration: 1.8, scale: 1, ease: "elastic.out(1.2, 0.4)" },
        1.2,
      );
    }, containerRef);

    const handleMouseEnter = () => {
      if (btTl && !isLoading) btTl.restart();
    };

    container.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      ctx.revert();
    };
  }, [isLoading]);

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* SVG Filter Hidden */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        className="hidden absolute"
      >
        <defs>
          <filter id="goo-filter">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* 💡 CORES ATUALIZADAS: 
        background: hsl(var(--primary)) - Cor base
        hover e active com tons mais escuros via opacity 
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .gooey-btn-container { position: relative; display: inline-block; width: 100%; }
        
        .gooey-btn { 
          position: relative; 
          z-index: 2; 
          background: transparent; 
          color: hsl(var(--primary-foreground)); 
          transition: all 0.2s ease-out; 
        }
        .gooey-btn:active { transform: scale(0.98); }
        
        .gooey-effect-container { 
          position: absolute; 
          display: block; 
          width: 200%; height: 400%; 
          top: -150%; left: -50%; 
          filter: url("#goo-filter"); 
          transition: all 0.1s ease-out; 
          pointer-events: none; 
        }
        
        /* Cor das bolhas (gosma) */
        .gooey-circle { 
          position: absolute; 
          width: 25px; height: 25px; 
          border-radius: 15px; 
          background: hsl(var(--primary) / 0.8); 
          transition: background 0.1s ease-out; 
        }
        .gooey-circle.top-left { top: 40%; left: 27%; }
        .gooey-circle.bottom-right { bottom: 40%; right: 27%; }
        
        /* Fundo do botão estático */
        .gooey-effect-button { 
          position: absolute; 
          width: 50%; height: 25%; 
          top: 50%; left: 25%; z-index: 1; 
          transform: translateY(-50%); 
          background: hsl(var(--primary)); 
          transition: background 0.2s ease-out; 
          border-radius: 0.75rem; 
        }

        /* Hover Escurecendo as cores */
        .gooey-btn-container:hover .gooey-circle, 
        .gooey-btn-container:hover .gooey-effect-button { 
          background: hsl(var(--primary) / 0.9); 
        }
      `,
        }}
      />

      <span className="gooey-btn-container">
        {/* O container ganha a sombra neon para manter a consistência da interface */}
        <div />

        <button
          onClick={onClick}
          disabled={isLoading}
          className="gooey-btn w-full h-12 rounded-xl flex items-center justify-center font-semibold text-base focus:outline-none"
        >
          {children}
        </button>

        <span className="gooey-effect-container">
          <span className="gooey-circle circle top-left"></span>
          <span className="gooey-circle circle top-left"></span>
          <span className="gooey-circle circle top-left"></span>

          <span className="gooey-effect-button effect-button"></span>

          <span className="gooey-circle circle bottom-right"></span>
          <span className="gooey-circle circle bottom-right"></span>
          <span className="gooey-circle circle bottom-right"></span>
        </span>
      </span>
    </div>
  );
}
// ============================================================================

export function AuthModal({ onUnlock, onJoinSession }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<AuthView>("manager");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [sessionCode, setSessionCode] = useState("");
  const [participantName, setParticipantName] = useState("");

  const orbRef = useRef<HTMLDivElement>(null);
  const hasMovedRef = useRef(false);
  const [isOrbVisible, setIsOrbVisible] = useState(false);
  const [isHoveringCard, setIsHoveringCard] = useState(false);

  useEffect(() => {
    if (orbRef.current) {
      const startX = window.innerWidth / 2 - 125;
      const startY = window.innerHeight / 2 - 125;
      orbRef.current.style.transform = `translate(${startX}px, ${startY}px)`;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        setIsOrbVisible(true);
      }

      if (orbRef.current) {
        const x = e.clientX - 125;
        const y = e.clientY - 125;
        orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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

      <div
        ref={orbRef}
        className="hidden sm:block fixed top-0 left-0 h-[250px] w-[250px] rounded-full bg-blue-500/20 blur-[80px] pointer-events-none z-0"
        style={{
          transition: "transform 0.20s ease-out, opacity 0.5s ease-in-out",
          opacity: isOrbVisible && !isHoveringCard ? 1 : 0,
          willChange: "transform, opacity",
        }}
      />

      <div
        className="relative z-10 w-full sm:max-w-md sm:px-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        onMouseEnter={() => setIsHoveringCard(true)}
        onMouseLeave={() => setIsHoveringCard(false)}
      >
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
              <GooeyButton
                onClick={
                  view === "manager"
                    ? handleManagerLogin
                    : handleCollaboratorJoin
                }
                isLoading={isLoading}
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
              </GooeyButton>
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
