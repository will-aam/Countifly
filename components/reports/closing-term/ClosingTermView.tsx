// components/reports/closing-term/ClosingTermView.tsx
"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReactToPrint } from "react-to-print";
import { toast } from "@/hooks/use-toast";
import { ClosingTermDocument } from "./ClosingTermDocument";
import type { ClosingTermData, ModalidadeFiscal } from "./types";
import { MODALIDADE_DESCRIPTIONS } from "./types";
import {
  Printer,
  FileText,
  SlidersHorizontal,
  Building2,
  Calendar,
  UserCheck,
  ArrowLeft,
  FileCheck2,
} from "lucide-react";

interface ClosingTermViewProps {
  initialData?: Partial<ClosingTermData>;
  onBack: () => void;
}

export function ClosingTermView({
  initialData = {},
  onBack,
}: ClosingTermViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Data atual formatada por extenso
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }, []);

  const todayIso = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Estado dos dados do termo
  const [data, setData] = useState<ClosingTermData>({
    companyName: initialData.companyName || "Empresa Auditada",
    companyCnpj: initialData.companyCnpj || "",
    companyAddress: initialData.companyAddress || "",
    databaseDate: initialData.databaseDate || todayIso,
    modalidade: initialData.modalidade || "A",
    metodoValorizacao: initialData.metodoValorizacao || "Custo Médio Ponderado",
    dataInicio: initialData.dataInicio || `${todayFormatted} - 08:00h`,
    dataFim: initialData.dataFim || `${todayFormatted} - 18:00h`,
    corteEntrada: initialData.corteEntrada || "NF-e Última Entrada",
    corteSaida: initialData.corteSaida || "NFC-e Última Saída",
    totalSkus: initialData.totalSkus || 0,
    totalUnidades: initialData.totalUnidades || 0,
    valorTotalEstoque: initialData.valorTotalEstoque || 0,
    acuraciaHomologada: initialData.acuraciaHomologada ?? 99.4,
    totalDivergenciasRecontadas: initialData.totalDivergenciasRecontadas || 0,
    totalAvariadosVencidos: initialData.totalAvariadosVencidos || 0,
    auditorNome: initialData.auditorNome || "Auditor Líder",
    auditorCargo: initialData.auditorCargo || "Líder de Operações Countifly",
    auditorDocumento: initialData.auditorDocumento || "Countifly Inventários",
    clienteNome: initialData.clienteNome || "Representante do Cliente",
    clienteCargo: initialData.clienteCargo || "Gerente / Diretor",
    clienteDocumento: initialData.clienteDocumento || "Empresa Auditada",
    contadorNome: initialData.contadorNome || "Contador Responsável",
    contadorCrc: initialData.contadorCrc || "CRC Ativo",
    cidadeUf: initialData.cidadeUf || "Aracaju - SE",
    dataEmissao: initialData.dataEmissao || todayFormatted,
    observacoes: initialData.observacoes || "",
  });

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setData((prev) => ({
        ...prev,
        ...initialData,
        companyName: initialData.companyName ?? prev.companyName ?? "Empresa Auditada",
        companyCnpj: initialData.companyCnpj ?? prev.companyCnpj ?? "",
        companyAddress: initialData.companyAddress ?? prev.companyAddress ?? "",
        databaseDate: initialData.databaseDate ?? prev.databaseDate ?? todayIso,
        dataInicio: initialData.dataInicio ?? prev.dataInicio ?? `${todayFormatted} - 08:00h`,
        dataFim: initialData.dataFim ?? prev.dataFim ?? `${todayFormatted} - 18:00h`,
        corteEntrada: initialData.corteEntrada ?? prev.corteEntrada ?? "NF-e Última Entrada",
        corteSaida: initialData.corteSaida ?? prev.corteSaida ?? "NFC-e Última Saída",
        auditorNome: initialData.auditorNome ?? prev.auditorNome ?? "Auditor Líder",
        auditorCargo: initialData.auditorCargo ?? prev.auditorCargo ?? "Líder de Operações Countifly",
        auditorDocumento: initialData.auditorDocumento ?? prev.auditorDocumento ?? "Countifly Inventários",
        clienteNome: initialData.clienteNome ?? prev.clienteNome ?? "Representante do Cliente",
        clienteCargo: initialData.clienteCargo ?? prev.clienteCargo ?? "Gerente / Diretor",
        clienteDocumento: initialData.clienteDocumento ?? prev.clienteDocumento ?? "Empresa Auditada",
        contadorNome: initialData.contadorNome ?? prev.contadorNome ?? "Contador Responsável",
        contadorCrc: initialData.contadorCrc ?? prev.contadorCrc ?? "CRC Ativo",
        cidadeUf: initialData.cidadeUf ?? prev.cidadeUf ?? "Aracaju - SE",
        dataEmissao: initialData.dataEmissao || prev.dataEmissao || todayFormatted,
        observacoes: initialData.observacoes ?? prev.observacoes ?? "",
      }));
    }
  }, [initialData, todayFormatted, todayIso]);

  // Hook para impressão via react-to-print v3
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Termo_Encerramento_${(data.companyName || "Inventario").replace(/\s+/g, "_")}`,
    onAfterPrint: () => {
      toast({
        title: "Termo de Encerramento emitido!",
        description: "Documento enviado para a fila de impressão / PDF.",
      });
    },
  });

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Barra Superior / Header de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2 shrink-0 font-medium h-9"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Exportação</span>
          </Button>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary shrink-0" />
              <span>Termo de Encerramento e Homologação</span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] font-bold border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Inventário Fiscal (PDF)
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Edite os parâmetros contábeis e homologue o inventário oficial para assinatura e entrega ao contador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handlePrint()}
            size="sm"
            className="gap-2 font-medium h-9 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / Salvar PDF</span>
          </Button>
        </div>
      </div>

      {/* Grid: Editor à Esquerda e Visualizador A4 à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PAINEL LATERAL DE EDIÇÃO */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-xl border border-border bg-card p-5 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-border">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Parâmetros do Fechamento</span>
          </div>

          {/* Grupo 1: Empresa e Data-Base */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>Empresa & Data-Base</span>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Razão Social / Nome Fantasia</Label>
              <Input
                value={data.companyName || ""}
                onChange={(e) => setData({ ...data, companyName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">CNPJ</Label>
                <Input
                  value={data.companyCnpj || ""}
                  onChange={(e) => setData({ ...data, companyCnpj: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Data-Base Fiscal</Label>
                <Input
                  value={data.databaseDate || ""}
                  onChange={(e) => setData({ ...data, databaseDate: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Unidade / Local Auditado</Label>
              <Input
                value={data.companyAddress || ""}
                onChange={(e) => setData({ ...data, companyAddress: e.target.value })}
                placeholder="Ex: Matriz - Centro de Distribuição"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Grupo 2: Modalidade e Valorização */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>Modalidade e Contabilidade</span>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Modalidade do Fechamento (Seção 10.2)</Label>
              <Select
                value={data.modalidade}
                onValueChange={(val: ModalidadeFiscal) => setData({ ...data, modalidade: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Modalidade A — Contagem Geral na Data-Base</SelectItem>
                  <SelectItem value="B">Modalidade B — Antecipada com Conciliação</SelectItem>
                  <SelectItem value="C">Modalidade C — Rotativa Anual com Fechamento</SelectItem>
                  <SelectItem value="D">Modalidade D — Por Amostragem com Auditoria</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                {MODALIDADE_DESCRIPTIONS[data.modalidade].desc}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Critério de Valorização do Estoque</Label>
              <Select
                value={data.metodoValorizacao}
                onValueChange={(val) => setData({ ...data, metodoValorizacao: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Custo Médio Ponderado">Custo Médio Ponderado</SelectItem>
                  <SelectItem value="Último Custo de Aquisição (Entrada)">Último Custo de Aquisição (Entrada)</SelectItem>
                  <SelectItem value="Custo Padrão Informado">Custo Padrão Informado</SelectItem>
                  <SelectItem value="Preço de Venda da Gôndola">Preço de Venda da Gôndola</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grupo 3: Corte Contábil (Cut-Off) & Horários */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Corte de Documentos (Cut-off)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Última NF Entrada</Label>
                <Input
                  value={data.corteEntrada || ""}
                  onChange={(e) => setData({ ...data, corteEntrada: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Última NF / Cupom Saída</Label>
                <Input
                  value={data.corteSaida || ""}
                  onChange={(e) => setData({ ...data, corteSaida: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Início / Fotografia</Label>
                <Input
                  value={data.dataInicio || ""}
                  onChange={(e) => setData({ ...data, dataInicio: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Encerramento Físico</Label>
                <Input
                  value={data.dataFim || ""}
                  onChange={(e) => setData({ ...data, dataFim: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Grupo 4: Signatários Formais */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Signatários Formais</span>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Auditor Líder (Countifly)</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={data.auditorNome || ""}
                  onChange={(e) => setData({ ...data, auditorNome: e.target.value })}
                  placeholder="Nome"
                  className="h-8 text-xs"
                />
                <Input
                  value={data.auditorCargo || ""}
                  onChange={(e) => setData({ ...data, auditorCargo: e.target.value })}
                  placeholder="Cargo"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Representante da Empresa Auditada</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={data.clienteNome || ""}
                  onChange={(e) => setData({ ...data, clienteNome: e.target.value })}
                  placeholder="Nome"
                  className="h-8 text-xs"
                />
                <Input
                  value={data.clienteCargo || ""}
                  onChange={(e) => setData({ ...data, clienteCargo: e.target.value })}
                  placeholder="Cargo"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Contador Responsável</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={data.contadorNome || ""}
                  onChange={(e) => setData({ ...data, contadorNome: e.target.value })}
                  placeholder="Nome do Contador"
                  className="h-8 text-xs"
                />
                <Input
                  value={data.contadorCrc || ""}
                  onChange={(e) => setData({ ...data, contadorCrc: e.target.value })}
                  placeholder="CRC/UF"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Cidade / UF</Label>
                <Input
                  value={data.cidadeUf || ""}
                  onChange={(e) => setData({ ...data, cidadeUf: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Data da Emissão</Label>
                <Input
                  value={data.dataEmissao || ""}
                  onChange={(e) => setData({ ...data, dataEmissao: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Grupo 5: Observações Adicionais */}
          <div className="space-y-2 pt-3 border-t border-border">
            <Label className="text-[11px] text-muted-foreground">Observações / Ressalvas Contábeis</Label>
            <textarea
              value={data.observacoes || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData({ ...data, observacoes: e.target.value })}
              placeholder="Digite aqui eventuais ressalvas, condições de contagem ou notas explicativas..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[70px] resize-none"
            />
          </div>
        </div>

        {/* VISUALIZADOR A4 (DIREITA) */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-xl border border-border bg-muted/20 p-4 sm:p-6 overflow-x-auto flex justify-center items-start shadow-sm">
          <div className="transform scale-[0.85] sm:scale-95 xl:scale-100 origin-top shadow-md">
            <ClosingTermDocument ref={printRef} data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
