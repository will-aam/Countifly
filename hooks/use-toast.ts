// hooks/use-toast.ts
/**
 * Descrição: Hook customizado para gerenciamento de notificações (Toast).
 * Responsabilidade: Fornece um sistema de gerenciamento de estado baseado em reducer
 * para criar, atualizar e descartar notificações. Implementa um padrão de estado global
 * fora do React, permitindo que o hook `toast` seja chamado de qualquer lugar
 * (inclusive fora de componentes) e que a UI se atualize reativamente.
 * Inspirado pela biblioteca react-hot-toast.
 */

"use client";

// --- Bibliotecas e Tipos do React ---
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// --- Constantes de Configuração ---
/** Limite de notificações exibidas simultaneamente. */
const TOAST_LIMIT = 1;
/**
 * Atraso (em milissegundos) antes de uma notificação ser removida da fila após ser descartada.
 * Um valor muito alto garante que a notificação permaneça até ser descartada manualmente pelo usuário.
 */
const TOAST_REMOVE_DELAY = 1000000;

// --- Definições de Tipos ---
/** Estende as props do componente Toast com propriedades internas de gerenciamento. */
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

/** Define os tipos de ações que podem ser despachadas para o reducer do estado. */
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

/** Contador global para gerar IDs únicos para cada notificação. */
let count = 0;

/** Gera um ID numérico único como string. */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

/** Tipo para os nomes das ações. */
type ActionType = typeof actionTypes;

/** Tipo união que define a estrutura de cada possível ação. */
type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

/** Interface para o estado global das notificações. */
interface State {
  toasts: ToasterToast[];
}

// --- Lógica de Gerenciamento de Estado ---
/** Mapa para rastrear os timeouts de remoção de cada notificação, evitando vazamentos de memória. */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Adiciona uma notificação à fila de remoção.
 * Garante que apenas um timeout seja agendado por notificação para evitar race conditions.
 * @param toastId - O ID da notificação a ser removida.
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Função reducer que gerencia as transições de estado das notificações.
 * @param state - O estado atual.
 * @param action - A ação a ser executada.
 * @returns O novo estado.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

/** Array de funções de ouvinte (subscribes) que são notificadas sobre mudanças de estado. */
const listeners: Array<(state: State) => void> = [];

/** Estado global que mantém a lista atual de notificações, fora do escopo do React. */
let memoryState: State = { toasts: [] };

/**
 * Despacha uma ação para o reducer, atualizando o estado global e notificando todos os ouvintes.
 * @param action - A ação a ser despachada.
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// --- API Pública ---
/** Tipo para as props de criação de uma notificação, sem o ID gerado internamente. */
type Toast = Omit<ToasterToast, "id">;

/**
 * Função imperativa para criar uma nova notificação.
 * @param props - As propriedades da notificação.
 * @returns Um objeto com funções para controlar a notificação (dismiss, update).
 */
function toast({ ...props }: Toast) {
  const id = genId();

  /** Função para atualizar as propriedades de uma notificação existente. */
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });

  /** Função para descartar uma notificação. */
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

/**
 * Hook React para interagir com o sistema de notificações.
 * Conecta o componente ao estado global, permitindo exibir as notificações e despachar ações.
 * @returns O estado atual das notificações e funções para interagir com o sistema.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
