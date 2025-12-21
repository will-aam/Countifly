"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign, PackagePlus } from "lucide-react";
import { AuditConfig } from "@/components/inventory/Audit/AuditSettingsTab";
import { calculateExpression } from "@/lib/utils";

interface ManualItemData {
  description: string;
  quantity: number;
  price?: number;
}

interface ManualItemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ManualItemData) => void;
  auditConfig: AuditConfig;
}

export function ManualItemSheet({
  isOpen,
  onClose,
  onConfirm,
  auditConfig,
}: ManualItemSheetProps) {
  const [description, setDescription] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");

  // Refs para gerenciar foco
  const quantityRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  // Limpa os campos ao abrir
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setQuantityInput("");
      setPriceInput("");
      setError("");
    }
  }, [isOpen]);

  const handleSave = () => {
    setError("");

    // 1. Valida Descrição
    if (!description.trim()) {
      setError("A descrição é obrigatória.");
      return;
    }

    // 2. Calcula e Valida Quantidade
    // Resolve a expressão matemática final antes de salvar (ex: "5+5" vira 10)
    const { result: qtd, isValid } = calculateExpression(quantityInput);

    if (!isValid || qtd <= 0) {
      setError("Quantidade inválida ou igual a zero.");
      return;
    }

    // 3. Trata Preço
    let finalPrice: number | undefined = undefined;
    if (auditConfig.collectPrice && priceInput) {
      const sanitizedPrice = priceInput
        .replace("R$", "")
        .trim()
        .replace(",", ".");
      const parsedPrice = parseFloat(sanitizedPrice);
      if (!isNaN(parsedPrice)) {
        finalPrice = parsedPrice;
      }
    }

    // 4. Salva e Fecha
    onConfirm({
      description: description.trim(),
      quantity: qtd,
      price: finalPrice,
    });
    onClose();
  };

  // Lógica inteligente do ENTER no input de Quantidade
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const hasMath = /[+\-*/]/.test(quantityInput);

      if (hasMath) {
        // Se tiver conta (ex: 5+5), calcula e atualiza o campo visualmente
        const { result, isValid } = calculateExpression(quantityInput);
        if (isValid) {
          setQuantityInput(result.toString());
        } else {
          setError("Expressão matemática inválida");
        }
      } else {
        // Se for só número e tiver preço ativado, pula pro preço
        if (auditConfig.collectPrice) {
          priceRef.current?.focus();
        } else {
          // Se não tiver preço, salva direto
          handleSave();
        }
      }
    }
  };

  // Enter na descrição pula pra quantidade
  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      quantityRef.current?.focus();
    }
  };

  // Enter no preço salva
  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Adicionar Item Manual
          </SheetTitle>
          <SheetDescription>
            Cadastre itens sem código de barras. O sistema gerará um código
            interno.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">
          {/* Campo Descrição */}
          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição do Produto</Label>
            <Input
              id="desc"
              placeholder="Ex: Pão Francês, Sacola..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleDescKeyDown}
              autoFocus
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Campo Quantidade (Com Calculadora) */}
            <div
              className={auditConfig.collectPrice ? "col-span-1" : "col-span-2"}
            >
              <Label htmlFor="qtd" className="mb-2 block">
                Quantidade
              </Label>
              <div className="relative">
                <Input
                  id="qtd"
                  ref={quantityRef}
                  placeholder="Ex: 5+5"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                  className="pl-9 h-12 font-semibold"
                  inputMode="text" // 'text' para permitir + - * /
                />
                <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Pressione Enter para calcular.
              </p>
            </div>

            {/* Campo Preço (Condicional) */}
            {auditConfig.collectPrice && (
              <div className="col-span-1">
                <Label htmlFor="price" className="mb-2 block">
                  Preço Unit.
                </Label>
                <div className="relative">
                  <Input
                    id="price"
                    ref={priceRef}
                    placeholder="0,00"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyDown={handlePriceKeyDown}
                    className="pl-9 h-12"
                    inputMode="decimal"
                  />
                  <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              🚨 {error}
            </div>
          )}
        </div>

        <SheetFooter>
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={handleSave} size="lg" className="w-full">
              Confirmar Lançamento
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              size="lg"
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
