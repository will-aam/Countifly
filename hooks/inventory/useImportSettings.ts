"use client";

import { useCallback, useEffect, useState } from "react";

export type ImportCountingLocation = "loja" | "estoque";

export interface ImportSettings {
  defaultCountingLocation: ImportCountingLocation;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  directScanEnabled: boolean;
}

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  defaultCountingLocation: "loja",
  soundEnabled: false,
  vibrationEnabled: true,
  directScanEnabled: false,
};

const storageKey = (userId: number) => `countifly_import_settings_v1_${userId}`;

const normalizeSettings = (value: unknown): ImportSettings => {
  if (!value || typeof value !== "object") return DEFAULT_IMPORT_SETTINGS;
  const saved = value as Partial<ImportSettings>;
  return {
    defaultCountingLocation:
      saved.defaultCountingLocation === "estoque" ? "estoque" : "loja",
    soundEnabled: saved.soundEnabled === true,
    vibrationEnabled: saved.vibrationEnabled !== false,
    directScanEnabled: saved.directScanEnabled === true,
  };
};

export function useImportSettings(userId: number | null) {
  const [settings, setSettings] = useState<ImportSettings>(
    DEFAULT_IMPORT_SETTINGS,
  );
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setSettings(DEFAULT_IMPORT_SETTINGS);
      setLoadedUserId(null);
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey(userId));
      setSettings(saved ? normalizeSettings(JSON.parse(saved)) : DEFAULT_IMPORT_SETTINGS);
    } catch {
      setSettings(DEFAULT_IMPORT_SETTINGS);
    }
    setLoadedUserId(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || loadedUserId !== userId) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(settings));
    } catch {
      // Preferências continuam disponíveis durante a sessão se o armazenamento estiver bloqueado.
    }
  }, [loadedUserId, settings, userId]);

  const updateSettings = useCallback((updates: Partial<ImportSettings>) => {
    setSettings((current) => ({ ...current, ...updates }));
  }, []);

  return { settings, updateSettings };
}
