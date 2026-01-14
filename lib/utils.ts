// lib/utils.ts
/**
 * Descrição: Utilitários globais da aplicação.
 * Responsabilidade: Funções auxiliares puras (sem estado React) para formatação,
 * cálculos matemáticos e lógica de comparação de dados.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { evaluate } from "mathjs";

/**
 * Combina classes do Tailwind CSS de forma inteligente, resolvendo conflitos.
 * @param inputs - Classes a serem combinadas.
 * @returns String de classes CSS sem conflitos.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- LÓGICA DE NEGÓCIO CENTRALIZADA ---

/**
 * Compara dois códigos de barras ignorando zeros à esquerda e caracteres não numéricos.
 * Ex: "00123" será considerado igual a "123".
 * Útil para mitigar diferenças entre o leitor de código de barras e o banco de dados.
 */
export const areBarcodesEqual = (
  a: string | null | undefined,
  b: string | null | undefined
): boolean => {
  if (!a || !b) return false;

  // Normaliza removendo tudo que não é número
  const cleanA = a.replace(/[^0-9]/g, "");
  const cleanB = b.replace(/[^0-9]/g, "");

  // Se ambos forem estritamente numéricos, compara o valor matemático (elimina zeros à esquerda)
  if (cleanA && cleanB && !isNaN(Number(cleanA)) && !isNaN(Number(cleanB))) {
    return Number(cleanA) === Number(cleanB);
  }

  // Fallback: comparação de texto simples (trim para garantir limpeza de espaços)
  return a.trim() === b.trim();
};

/**
 * Avalia uma expressão matemática em formato de string de forma segura.
 * Utiliza a biblioteca 'mathjs' para evitar o uso inseguro de 'eval'.
 * Suporta vírgula como separador decimal (padrão BR).
 * * @param expression - A string da expressão matemática (ex: "10+5*2" ou "10,5+2").
 * @returns Um objeto com o resultado numérico, validade e mensagem de erro opcional.
 */
export const calculateExpression = (
  expression: string
): { result: number; isValid: boolean; error?: string } => {
  try {
    // Substitui vírgula por ponto para o padrão internacional aceito pelo mathjs
    const cleanExpression = expression.replace(/,/g, ".");

    // Resolve a conta
    const result = evaluate(cleanExpression);

    // Valida se o resultado é um número finito válido
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return {
        result: 0,
        isValid: false,
        error: "Resultado inválido",
      };
    }

    // Retorna arredondado para 2 casas decimais para evitar imprecisões de ponto flutuante
    return { result: Math.round(result * 100) / 100, isValid: true };
  } catch (error) {
    return {
      result: 0,
      isValid: false,
      error: "Erro de sintaxe na expressão",
    };
  }
};

export function formatNumberBR(
  value: number | string | undefined | null
): string {
  if (value === undefined || value === null || value === "") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "0";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0, // Se for inteiro, não mostra vírgula (10 vira 10)
    maximumFractionDigits: 3, // Aceita até 3 casas (quilos/gramas)
  }).format(num);
}

// Adicionar ao final de lib/utils.ts

/**
 * Formata um número para o padrão de moeda brasileiro (BRL).
 * @param value - O valor a ser formatado (number ou string numérica).
 * @returns String formatada como moeda (ex: "R$ 1.234,56").
 */
export function formatCurrency(
  value: number | string | undefined | null
): string {
  if (value === undefined || value === null || value === "") return "R$ 0,00";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}
