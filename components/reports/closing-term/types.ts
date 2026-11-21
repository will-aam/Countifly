// components/reports/closing-term/types.ts

export type ModalidadeFiscal = "A" | "B" | "C" | "D";

export interface ClosingTermData {
  // Identificação do Estabelecimento
  companyName: string;
  companyCnpj: string;
  companyAddress?: string;

  // Parâmetros do Fechamento Fiscal (Seção 10 do Manual)
  databaseDate: string; // Data-base contábil (ex: 31/12/2026)
  modalidade: ModalidadeFiscal; // A, B, C ou D (Seção 10.2)
  metodoValorizacao: string; // Ex: Custo Médio Ponderado, Custo de Aquisição, etc.
  dataInicio: string; // Fotografia do Momento (Congelamento)
  dataFim: string; // Conclusão e liberação

  // Corte Contábil de Documentos (Cut-off - Seção 10.3)
  corteEntrada: string; // Último Documento / NF de Entrada lançado
  corteSaida: string; // Último Documento / NF / Cupom de Saída emitido

  // Resultados Oficiais Homologados (Seção 10.6)
  totalSkus: number;
  totalUnidades: number;
  valorTotalEstoque: number;
  acuraciaHomologada: number; // Percentual (ex: 99.4)
  totalDivergenciasRecontadas: number;
  totalAvariadosVencidos: number;

  // Assinaturas Formais
  auditorNome: string;
  auditorCargo: string;
  auditorDocumento: string;

  clienteNome: string;
  clienteCargo: string;
  clienteDocumento: string;

  contadorNome: string;
  contadorCrc: string;

  // Localização e Emissão
  cidadeUf: string;
  dataEmissao: string;
  observacoes?: string;
}

export const MODALIDADE_DESCRIPTIONS: Record<ModalidadeFiscal, { title: string; desc: string }> = {
  A: {
    title: "Modalidade A — Contagem Geral na Data-Base",
    desc: "100% do estoque contado de uma só vez com operação travada e estoque congelado.",
  },
  B: {
    title: "Modalidade B — Contagem Antecipada com Conciliação",
    desc: "Contagem prévia à data-base conciliando rigorosamente entradas e saídas do período.",
  },
  C: {
    title: "Modalidade C — Rotativa ao Longo do Ano com Fechamento",
    desc: "Consolidação dos ciclos rotativos anuais com recontagem homologatória dos itens Classe A.",
  },
  D: {
    title: "Modalidade D — Por Amostragem com Auditoria",
    desc: "Contagem total dos itens de maior valor e amostragem estatística homologada com auditoria sênior.",
  },
};
