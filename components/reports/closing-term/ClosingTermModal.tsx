// components/reports/closing-term/ClosingTermModal.tsx
"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FileCheck2,
  ShieldAlert,
} from "lucide-react";

interface ClosingTermModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<ClosingTermData>;
}

export function ClosingTermModal({
  open,
  onOpenChange,
  initialData = {},
}: ClosingTermModalProps) {
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

  // Atualiza dados quando initialData mudar e modal abrir
  React.useEffect(() => {
    if (open && initialData) {
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
  }, [open, initialData, todayFormatted, todayIso]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background">
        {/* Cabeçalho do Modal */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border bg-card/60 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Termo de Encerramento Formal (Inventário Fiscal)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Seção 10 & 11 do Manual
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Documento oficial para fechamento contábil, homologação de acurácia e entrega ao contador.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePrint()}
              size="sm"
              className="gap-2 font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo: Painel de Edição à Esquerda + Visualizador A4 à Direita */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* PAINEL LATERAL: Parâmetros do Fechamento */}
          <div className="lg:col-span-4 xl:col-span-4 border-r border-border p-4 overflow-y-auto space-y-5 bg-card/40">
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
                  value={data.companyName}
                  onChange={(e) => setData({ ...data, companyName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">CNPJ</Label>
                  <Input
                    value={data.companyCnpj}
                    onChange={(e) => setData({ ...data, companyCnpj: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Data-Base Fiscal</Label>
                  <Input
                    value={data.databaseDate}
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

            {/* Grupo 2: Modalidade e Valorização (Seção 10.2) */}
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
                    value={data.corteEntrada}
                    onChange={(e) => setData({ ...data, corteEntrada: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Última NF / Cupom Saída</Label>
                  <Input
                    value={data.corteSaida}
                    onChange={(e) => setData({ ...data, corteSaida: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Início / Fotografia</Label>
                  <Input
                    value={data.dataInicio}
                    onChange={(e) => setData({ ...data, dataInicio: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Encerramento Físico</Label>
                  <Input
                    value={data.dataFim}
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
                    value={data.auditorNome}
                    onChange={(e) => setData({ ...data, auditorNome: e.target.value })}
                    placeholder="Nome"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={data.auditorCargo}
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
                    value={data.clienteNome}
                    onChange={(e) => setData({ ...data, clienteNome: e.target.value })}
                    placeholder="Nome"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={data.clienteCargo}
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
                    value={data.contadorNome}
                    onChange={(e) => setData({ ...data, contadorNome: e.target.value })}
                    placeholder="Nome do Contador"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={data.contadorCrc}
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
                    value={data.cidadeUf}
                    onChange={(e) => setData({ ...data, cidadeUf: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Data da Emissão</Label>
                  <Input
                    value={data.dataEmissao}
                    onChange={(e) => setData({ ...data, dataEmissao: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VISUALIZADOR A4 (DIREITA) */}
          <div className="lg:col-span-8 xl:col-span-8 bg-muted/40 p-4 sm:p-6 overflow-y-auto flex justify-center items-start">
            <div className="transform scale-[0.92] sm:scale-100 origin-top">
              <ClosingTermDocument ref={printRef} data={data} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
