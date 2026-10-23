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
import type { AuditConfig } from "@/lib/audit";
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

  const quantityRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setQuantityInput("");
      setPriceInput("");
      setError("");
    }
  }, [isOpen]);

  // --- MÁSCARA MONETÁRIA (PIX) ---
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setPriceInput("");
      return;
    }
    const value = Number(rawValue) / 100;
    const formatted = value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setPriceInput(formatted);
  };

  const handleSave = () => {
    setError("");

    if (!description.trim()) {
      setError("A descrição é obrigatória.");
      return;
    }

    let qtd = 0;
    if (auditConfig.collectQuantity) {
      const calculation = calculateExpression(quantityInput);
      if (!calculation.isValid || calculation.result <= 0) {
        setError("Quantidade inválida ou igual a zero.");
        return;
      }
      qtd = calculation.result;
    }

    let finalPrice: number | undefined = undefined;
    if (auditConfig.collectPrice && priceInput) {
      // Remove ponto de milhar e ajusta decimal para conversão
      const cleanPrice = priceInput.replace(/\./g, "").replace(",", ".");
      const parsedPrice = parseFloat(cleanPrice);
      if (!isNaN(parsedPrice)) {
        finalPrice = parsedPrice;
      }
    }

    onConfirm({
      description: description.trim(),
      quantity: qtd,
      price: finalPrice,
    });
    onClose();
  };

  // Lógica de Enter
  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const hasMath = /[+\-*/]/.test(quantityInput);
      if (hasMath) {
        const { result, isValid } = calculateExpression(quantityInput);
        if (isValid) {
          setQuantityInput(result.toString());
        } else {
          setError("Expressão matemática inválida");
        }
      } else {
        if (auditConfig.collectQuantity && auditConfig.collectPrice) {
          priceRef.current?.focus();
        } else if (auditConfig.collectQuantity) {
          handleSave();
        } else if (auditConfig.collectPrice) {
          priceRef.current?.focus();
        } else {
          handleSave();
        }
      }
    }
  };

  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (auditConfig.collectQuantity) quantityRef.current?.focus();
      else if (auditConfig.collectPrice) priceRef.current?.focus();
      else handleSave();
    }
  };

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
            Cadastre itens sem código de barras.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">
          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição do Produto</Label>
            <Input
              id="desc"
              placeholder="Ex: Pão Francês"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleDescKeyDown}
              autoFocus
              className="h-12"
            />
          </div>

          <div className={`grid gap-4 ${auditConfig.collectQuantity && auditConfig.collectPrice ? "grid-cols-2" : "grid-cols-1"}`}>
            {auditConfig.collectQuantity && (
            <div
              className="col-span-1"
            >
              <Label htmlFor="qtd" className="mb-2 block">
                Quantidade
              </Label>
              <div className="relative">
                <Input
                  id="qtd"
                  ref={quantityRef}
                  // placeholder="Ex: 5"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                  className="pl-9 h-12 font-semibold"
                  inputMode="decimal" // Teclado numérico/decimal
                />
                <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            )}

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
                    onChange={handlePriceChange} // MÁSCARA AQUI
                    onKeyDown={handlePriceKeyDown}
                    className="pl-9 h-12"
                    inputMode="numeric" // Teclado numérico puro
                  />
                  <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deixe em branco para revisar o preço depois.
                </p>
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
