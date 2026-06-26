// app/(main)/admin/subscriptions/page.tsx
/// ==========================================
// PÁGINA DE ASSINATURAS - SIMULAÇÃO VISUAL
// ==========================================
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
  BellRing,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ==========================================
// DADOS FALSOS (MOCK) PARA SIMULAÇÃO VISUAL
// ==========================================
const MOCK_USERS = [
  {
    id: 1,
    name: "Supermercado Central",
    plan: "Plano Completo (4 Módulos)",
    value: 250.0,
    daysLeft: 15,
    status: "paid", // Pago / Em dia
  },
  {
    id: 2,
    name: "Loja de Conveniência B",
    plan: "Plano Básico (Apenas Importação)",
    value: 89.9,
    daysLeft: 3,
    status: "pending", // Vencendo logo
  },
  {
    id: 3,
    name: "Depósito Silva",
    plan: "Plano Equipe (Sala + Importação)",
    value: 150.0,
    daysLeft: -2,
    status: "overdue", // Atrasado
  },
  {
    id: 4,
    name: "Farmácia do Bairro",
    plan: "Plano Padrão (Livre)",
    value: 100.0,
    daysLeft: 22,
    status: "paid",
  },
];

export default function SubscriptionsMockupPage() {
  // Cálculos simulados baseados no Mock
  const totalUsers = MOCK_USERS.length;
  const monthlyRevenue = MOCK_USERS.reduce((acc, user) => acc + user.value, 0);

  // Simulando um valor acumulado de 6 meses desses clientes
  const accumulatedRevenue = monthlyRevenue * 6;

  const pendingUsers = MOCK_USERS.filter(
    (u) => u.status === "pending" || u.status === "overdue",
  ).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-md bg-emerald-500/10">
            <Wallet className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Gestão de Assinaturas{" "}
            <Badge
              variant="outline"
              className="ml-2 bg-amber-100 text-amber-800 border-amber-300"
            >
              Simulação visual
            </Badge>
          </h2>
        </div>
        <p className="text-muted-foreground">
          Acompanhe o faturamento, planos e vencimentos dos seus clientes.
        </p>
      </div>

      {/* Cards de Resumo (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR (Receita Mensal)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-emerald-500 font-medium mr-1">+12%</span> em
              relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Acumulado (Simulado)
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(accumulatedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma histórica de pagamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assinaturas recorrentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atenção (Vencimentos)
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {pendingUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atrasados ou vencendo em 5 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Controle de Pagamentos */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="text-lg">Controle de Mensalidades</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano / Módulos</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.plan}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(user.value)}
                  </TableCell>
                  <TableCell>
                    {user.status === "paid" && (
                      <Badge
                        variant="default"
                        className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Em dia (
                        {user.daysLeft} dias)
                      </Badge>
                    )}
                    {user.status === "pending" && (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20"
                      >
                        <Calendar className="h-3 w-3 mr-1" /> Vence em{" "}
                        {user.daysLeft} dias
                      </Badge>
                    )}
                    {user.status === "overdue" && (
                      <Badge
                        variant="destructive"
                        className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" /> Atrasado há{" "}
                        {Math.abs(user.daysLeft)} dias
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.status === "overdue" || user.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs"
                      >
                        <BellRing className="h-3 w-3 mr-1.5" /> Cobrar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground mr-4">
                        Tudo certo
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
