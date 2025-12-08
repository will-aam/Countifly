/**
 * Descrição: Componente de Scanner de Código de Barras "Pro".
 * Melhorias V2:
 * 1. Feedback Híptico (Vibração).
 * 2. Feedback Visual Semântico (Verde = Sucesso, Vermelho = Duplicado/Erro).
 * 3. Áudio Otimizado.
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Loader2, CameraOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const MIN_BARCODE_LENGTH = 8;

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Estados visuais
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "success" | "error"
  >("idle");

  /**
   * Toca o som de Beep (Sucesso ou Erro)
   */
  const playBeep = useCallback((type: "success" | "error" = "success") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      if (context.state === "suspended") context.resume();

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      // Configuração sonora: Sucesso (agudo/curto), Erro (grave/longo)
      if (type === "success") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(800, context.currentTime);
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
      } else {
        oscillator.type = "sawtooth"; // Som mais "áspero" para erro
        oscillator.frequency.setValueAtTime(150, context.currentTime);
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Áudio não suportado.");
    }
  }, []);

  /**
   * Aciona a vibração do dispositivo (se suportado)
   */
  const triggerVibration = useCallback((type: "success" | "error") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "success") {
        navigator.vibrate(200); // Vibração única e firme
      } else {
        navigator.vibrate([100, 50, 100]); // Padrão de erro (duas tremidas)
      }
    }
  }, []);

  /**
   * Feedback Unificado (Visual + Sonoro + Tátil)
   */
  const triggerFeedback = useCallback(
    (type: "success" | "error") => {
      setFeedbackState(type);
      playBeep(type);
      triggerVibration(type);

      // Reseta o estado visual após 500ms
      setTimeout(() => setFeedbackState("idle"), 500);
    },
    [playBeep, triggerVibration]
  );

  const handleScanResult = useCallback(
    (result: string) => {
      // Ignora leituras inválidas/ruído
      if (!result || result.length < MIN_BARCODE_LENGTH) return;

      const now = Date.now();

      // VERIFICAÇÃO DE DUPLICIDADE (Debounce)
      // Se leu o mesmo código há menos de 2 segundos, consideramos erro/aviso
      if (
        lastScannedRef.current === result &&
        now - lastScanTimeRef.current < 2000
      ) {
        // Ativando feedback de duplicidade conforme solicitado
        triggerFeedback("error");
        return;
      }

      lastScannedRef.current = result;
      lastScanTimeRef.current = now;

      // SUCESSO: Bipa, Vibra, Pisca Verde e Processa
      triggerFeedback("success");
      onScan(result);
    },
    [onScan, triggerFeedback]
  );

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    const videoElement = videoRef.current;

    const startScanner = async () => {
      try {
        const videoInputDevices =
          await codeReaderRef.current?.listVideoInputDevices();

        if (!videoInputDevices || videoInputDevices.length === 0) {
          toast({
            title: "Erro",
            description: "Câmera não encontrada.",
            variant: "destructive",
          });
          onClose();
          return;
        }

        const rearCamera = videoInputDevices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("traseira") ||
            device.label.toLowerCase().includes("environment")
        );

        const deviceId =
          rearCamera?.deviceId ||
          videoInputDevices[videoInputDevices.length - 1]?.deviceId;

        if (videoElement) {
          await codeReaderRef.current?.decodeFromVideoDevice(
            deviceId,
            videoElement,
            (result, error) => {
              if (result) handleScanResult(result.getText());
            }
          );
        }
      } catch (error) {
        console.error("Erro Câmera:", error);
        toast({
          title: "Erro",
          description: "Permissão de câmera negada.",
          variant: "destructive",
        });
        onClose();
      }
    };

    startScanner();

    return () => {
      codeReaderRef.current?.reset();
    };
  }, [onClose, handleScanResult]);

  // --- Lógica de Estilos Dinâmicos ---
  const getOverlayColor = () => {
    if (feedbackState === "success")
      return "border-green-500 bg-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.6)]";
    if (feedbackState === "error")
      return "border-red-500 bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.6)]";
    return "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"; // Estado padrão (buscando)
  };

  return (
    <div className="space-y-3 mt-4 p-4 border rounded-lg bg-black/95 shadow-inner">
      <div className="relative overflow-hidden rounded-lg bg-zinc-900 aspect-video">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            feedbackState !== "idle" ? "opacity-90" : "opacity-100"
          }`}
          autoPlay
          playsInline
          muted
        />

        {/* Overlay de Feedback Visual (O "Flash") */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-3/4 h-1/2 border-4 rounded-lg transition-all duration-200 ${getOverlayColor()}`}
          />

          <p className="absolute bottom-4 text-xs text-white/90 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
            {feedbackState === "success"
              ? "LIDO COM SUCESSO"
              : feedbackState === "error"
              ? "JÁ LIDO / ERRO"
              : "Aponte para o código"}
          </p>
        </div>
      </div>

      <Button
        onClick={onClose}
        variant="secondary"
        className="w-full mobile-button bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
      >
        <CameraOff className="mr-2 h-4 w-4" />
        Parar Câmera
      </Button>
    </div>
  );
}
