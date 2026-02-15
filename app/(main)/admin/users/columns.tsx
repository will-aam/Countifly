// app/(main)/admin/users/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, Loader2, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  createdAt: string;
  ativo: boolean;
  moduloImportacao: boolean;
  moduloLivre: boolean;
  moduloSala: boolean;
}

interface ColumnActions {
  onStatusToggle: (userId: number, currentStatus: boolean) => Promise<void>;
  onModuleToggle: (
    userId: number,
    moduleName: "modulo_importacao" | "modulo_livre" | "modulo_sala",
    currentValue: boolean,
  ) => Promise<void>;
  updatingUserId: number | null;
}

export const createColumns = (actions: ColumnActions): ColumnDef<User>[] => [
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const ativo = row.original.ativo;
      return (
        <div className="flex items-center gap-2">
          {ativo ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <Badge
                variant="default"
                className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
              >
                Ativo
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <Badge
                variant="destructive"
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                Inativo
              </Badge>
            </>
          )}
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      return rowA.original.ativo === rowB.original.ativo
        ? 0
        : rowA.original.ativo
          ? 1
          : -1;
    },
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent"
        >
          Nome
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.original.displayName || "—";
      return <div className="font-medium">{name}</div>;
    },
    sortingFn: (rowA, rowB) => {
      const nameA = (
        rowA.original.displayName || rowA.original.email
      ).toLowerCase();
      const nameB = (
        rowB.original.displayName || rowB.original.email
      ).toLowerCase();
      return nameA.localeCompare(nameB);
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div className="text-muted-foreground">{row.original.email}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent"
        >
          Cadastro
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString("pt-BR")}
        </div>
      );
    },
  },
  {
    id: "moduloImportacao",
    header: () => <div className="text-center">Importação</div>,
    cell: ({ row }) => {
      const isUpdating = actions.updatingUserId === row.original.id;
      return (
        <div className="flex justify-center">
          <Switch
            checked={row.original.moduloImportacao}
            onCheckedChange={() =>
              actions.onModuleToggle(
                row.original.id,
                "modulo_importacao",
                row.original.moduloImportacao,
              )
            }
            disabled={isUpdating}
          />
        </div>
      );
    },
  },
  {
    id: "moduloLivre",
    header: () => <div className="text-center">Livre</div>,
    cell: ({ row }) => {
      const isUpdating = actions.updatingUserId === row.original.id;
      return (
        <div className="flex justify-center">
          <Switch
            checked={row.original.moduloLivre}
            onCheckedChange={() =>
              actions.onModuleToggle(
                row.original.id,
                "modulo_livre",
                row.original.moduloLivre,
              )
            }
            disabled={isUpdating}
          />
        </div>
      );
    },
  },
  {
    id: "moduloSala",
    header: () => <div className="text-center">Sala</div>,
    cell: ({ row }) => {
      const isUpdating = actions.updatingUserId === row.original.id;
      return (
        <div className="flex justify-center">
          <Switch
            checked={row.original.moduloSala}
            onCheckedChange={() =>
              actions.onModuleToggle(
                row.original.id,
                "modulo_sala",
                row.original.moduloSala,
              )
            }
            disabled={isUpdating}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">Ações</div>,
    cell: ({ row }) => {
      const isUpdating = actions.updatingUserId === row.original.id;
      return (
        <div className="flex justify-center">
          <Button
            variant={row.original.ativo ? "ghost" : "default"}
            size="sm"
            onClick={() =>
              actions.onStatusToggle(row.original.id, row.original.ativo)
            }
            disabled={isUpdating}
            className={
              row.original.ativo
                ? "hover:bg-destructive/10 hover:text-destructive"
                : ""
            }
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : row.original.ativo ? (
              "Desativar"
            ) : (
              "Ativar"
            )}
          </Button>
        </div>
      );
    },
  },
];
