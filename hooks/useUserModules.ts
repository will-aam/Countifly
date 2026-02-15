// hooks/useUserModules.ts
// Hook para verificar permissões de módulos e tipo de usuário
import { useEffect, useState } from "react";

interface UserModules {
  importacao: boolean;
  livre: boolean;
  sala: boolean;
}

interface UserData {
  id: number;
  email: string;
  displayName: string | null;
  preferredMode: string | null;
  tipo: "ADMIN" | "USUARIO";
  modules: UserModules;
}

interface UseUserModulesReturn {
  isAdmin: boolean;
  hasModule: (moduleName: "importacao" | "livre" | "sala") => boolean;
  loading: boolean;
  error: string | null;
  userData: UserData | null;
}

export function useUserModules(): UseUserModulesReturn {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Falha ao carregar dados do usuário");
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Erro ao buscar dados do usuário");
        }

        setUserData({
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          preferredMode: data.preferredMode,
          tipo: data.tipo,
          modules: data.modules,
        });
        setError(null);
      } catch (err: any) {
        console.error("Erro ao carregar permissões do usuário:", err);
        setError(err.message || "Erro desconhecido");
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const isAdmin = userData?.tipo === "ADMIN";

  const hasModule = (moduleName: "importacao" | "livre" | "sala"): boolean => {
    if (!userData) return false;
    if (isAdmin) return true; // Admin sempre tem acesso a todos os módulos
    return userData.modules[moduleName] || false;
  };

  return {
    isAdmin,
    hasModule,
    loading,
    error,
    userData,
  };
}
