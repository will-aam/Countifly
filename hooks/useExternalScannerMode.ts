"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "countifly-external-scanner-mode-v1";

export function useExternalScannerMode() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === "true");
    } catch (error) {
      console.warn("Não foi possível carregar a preferência do leitor externo.", error);
    } finally {
      setReady(true);
    }

    const syncPreference = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setEnabled(event.newValue === "true");
    };
    window.addEventListener("storage", syncPreference);
    return () => window.removeEventListener("storage", syncPreference);
  }, []);

  const updateEnabled = useCallback((nextEnabled: boolean) => {
    setEnabled(nextEnabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(nextEnabled));
    } catch (error) {
      console.warn("Não foi possível salvar a preferência do leitor externo.", error);
    }
  }, []);

  return {
    externalScannerMode: enabled,
    setExternalScannerMode: updateEnabled,
    externalScannerModeReady: ready,
  };
}
