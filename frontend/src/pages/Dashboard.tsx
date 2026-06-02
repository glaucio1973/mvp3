import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
} from 'lucide-react';
import api from '../utils/api';
import { DashboardData } from '../types';
import { formatCurrency, formatDate, paymentMethodLabel } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const paymentIcons = {
    CASH: Banknote,
    CARD: CreditCard,
    PIX: Smartphone,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Vendas Hoje"
          value={formatCurrency(data?.todaySales.total || 0)}
          subtitle={`${data?.todaySales.count || 0} transações`}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatsCard
          title="Vendas do Mês"
          value={formatCurrency(data?.monthSales.total || 0)}
          subtitle={`${data?.monthSales.count || 0} transações`}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatsCard
          title="Produtos Ativos"
          value={String(data?.totalProducts || 0)}
          subtitle="no catálogo"
          icon={Package}
          color="bg-purple-500"
        />
        <StatsCard
          title="Estoque Baixo"
          value={String(data?.lowStockCount || 0)}
          subtitle="produtos críticos"
          icon={AlertTriangle}
          color={data?.lowStockCount ? 'bg-orange-500' : 'bg-gray-400'}
        />
      </div>

      {/* Cash Register Status */}
      {data?.openCashRegister && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Caixa Aberto</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Operador: {data.openCashRegister.operator.name} • Desde {formatDate(data.openCashRegister.openedAt)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cash">Ver Caixa</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Estoque Baixo
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products?lowStock=true">
                  Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={product.stock === 0 ? 'destructive' : 'warning'}>
                      {product.stock === 0 ? 'Sem estoque' : `${product.stock} un.`}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Mín: {product.minStock}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              Últimas Vendas
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sales">
                Ver todas <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.recentSales && data.recentSales.length > 0 ? (
              data.recentSales.map((sale) => {
                const PayIcon = paymentIcons[sale.paymentMethod as keyof typeof paymentIcons] || Banknote;
                return (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <PayIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{paymentMethodLabel[sale.paymentMethod as keyof typeof paymentMethodLabel]}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(sale.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{formatCurrency(sale.total)}</p>
                      <p className="text-xs text-muted-foreground">{sale.items.length} item(s)</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhuma venda hoje</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
