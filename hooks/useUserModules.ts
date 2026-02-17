// hooks/useUserModules.ts
// Responsabilidade:
// 1. Gerenciar o estado dos módulos disponíveis para o usuário (importação, livre, sala).
// 2. Fornecer funções para verificar se um módulo está disponível ou bloqueado.
// 3. Carregar os dados do usuário e seus módulos ao iniciar o aplicativo.

"use client";

import { useState, useEffect } from "react";

interface UserModules {
  importacao: boolean;
  livre: boolean;
  sala: boolean;
}

interface UserData {
  id: number;
  tipo: "ADMIN" | "USUARIO";
  modules: UserModules;
}

export function useUserModules() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();

        if (data.success) {
          setUserData({
            id: data.id,
            tipo: data.tipo,
            modules: data.modules,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const isAdmin = userData?.tipo === "ADMIN";

  const hasModule = (module: keyof UserModules): boolean => {
    return isAdmin || userData?.modules[module] === true;
  };

  // NOVO: Verifica se módulo existe mas está bloqueado
  const isModuleLocked = (module: keyof UserModules): boolean => {
    if (isAdmin) return false; // Admin nunca tem bloqueio
    return userData?.modules[module] === false;
  };

  return {
    userData,
    loading,
    isAdmin,
    hasModule,
    isModuleLocked, // NOVA FUNÇÃO
  };
}
