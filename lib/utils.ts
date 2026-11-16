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
  b: string | null | undefined,
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
  expression: string,
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
  value: number | string | undefined | null,
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
  value: number | string | undefined | null,
): string {
  if (value === undefined || value === null || value === "") return "R$ 0,00";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Valida rigorosamente uma data no formato brasileiro DD/MM/AAAA.
 * Checa formato, limites de mês (01-12), limites de ano e dias reais do mês (trata anos bissextos).
 */
export function validateDateBR(val: string): { isValid: boolean; error?: string } {
  const trimmed = val.trim();
  if (!trimmed) return { isValid: true };

  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = trimmed.match(regex);
  if (!match) {
    return {
      isValid: false,
      error: "Data incompleta. Preencha no formato DD/MM/AAAA.",
    };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: `Mês ${match[2]} inexistente. O mês deve ser de 01 a 12.`,
    };
  }

  if (year < 2000 || year > 2100) {
    return {
      isValid: false,
      error: `Ano ${year} inválido. Informe um ano entre 2000 e 2100.`,
    };
  }

  // Verifica dias reais do mês/ano (trata fev bissexto, 30 vs 31 dias)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      isValid: false,
      error: `Dia ${match[1]} inválido para ${match[2]}/${year} (este mês tem ${daysInMonth} dias).`,
    };
  }

  return { isValid: true };
}

/**
 * Analisa se uma data DD/MM/AAAA é futura, hoje ou expirada comparada com a data atual.
 */
export function checkValidadeStatusBR(val: string): {
  isValid: boolean;
  isExpired: boolean;
  isFuture: boolean;
} {
  const check = validateDateBR(val);
  if (!check.isValid || !val.trim() || val.trim().length < 10) {
    return { isValid: false, isExpired: false, isFuture: false };
  }

  const parts = val.trim().split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return {
    isValid: true,
    isExpired: date.getTime() < today.getTime(),
    isFuture: date.getTime() >= today.getTime(),
  };
}

/**
 * Formata e sanitiza digitação de data no formato DD/MM/AAAA,
 * impedindo dias maiores que 31 e meses maiores que 12 em tempo real.
 */
export function formatDateInputBR(input: string, prevInput: string = ""): string {
  // Se estiver apagando, permite fluir livremente
  if (input.length < prevInput.length) {
    return input;
  }

  const raw = input.replace(/\D/g, "").slice(0, 8);
  if (!raw) return "";

  // 1. Trata os dígitos do Dia (máximo 31)
  let dayStr = "";
  if (raw.length === 1) {
    const d1 = parseInt(raw, 10);
    if (d1 > 3) {
      dayStr = `0${d1}/`;
    } else {
      return raw;
    }
  } else {
    let d = parseInt(raw.slice(0, 2), 10);
    if (d === 0) d = 1;
    if (d > 31) d = 31;
    dayStr = `${String(d).padStart(2, "0")}/`;
  }

  if (raw.length === 2) {
    return dayStr;
  }

  // 2. Trata os dígitos do Mês (máximo 12)
  const monthRaw = raw.slice(2);
  let monthStr = "";
  if (monthRaw.length === 1) {
    const m1 = parseInt(monthRaw, 10);
    if (m1 > 1) {
      monthStr = `0${m1}/`;
    } else {
      return `${dayStr}${monthRaw}`;
    }
  } else {
    let m = parseInt(monthRaw.slice(0, 2), 10);
    if (m === 0) m = 1;
    if (m > 12) m = 12;
    monthStr = `${String(m).padStart(2, "0")}/`;
  }

  if (monthRaw.length <= 2) {
    return `${dayStr}${monthStr}`;
  }

  // 3. Trata os dígitos do Ano (até 4 dígitos)
  const yearRaw = monthRaw.slice(2, 6);
  return `${dayStr}${monthStr}${yearRaw}`;
}
