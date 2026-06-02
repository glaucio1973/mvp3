import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';
import api from '../utils/api';
import { SalesReport } from '../types';
import { formatCurrency, formatDateShort, formatDate } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const paymentColors: Record<string, string> = {
  CASH: '#10B981',
  CARD: '#2563EB',
  PIX: '#F59E0B',
};

const paymentLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  PIX: 'Pix',
};

export default function Reports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: report, isLoading } = useQuery<SalesReport>({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () =>
      api.get('/reports/sales', { params: { startDate, endDate } }).then((r) => r.data),
  });

  const { data: stockReport } = useQuery({
    queryKey: ['stock-report'],
    queryFn: () => api.get('/reports/stock').then((r) => r.data),
  });

  const { data: abcReport } = useQuery({
    queryKey: ['abc-report', startDate, endDate],
    queryFn: () =>
      api.get('/reports/abc', { params: { startDate, endDate } }).then((r) => r.data),
  });

  const { data: cashDailyReport } = useQuery({
    queryKey: ['cash-daily-report', startDate, endDate],
    queryFn: () =>
      api.get('/reports/cash-daily', { params: { startDate, endDate } }).then((r) => r.data),
  });

  const paymentData = report?.byPayment
    ? Object.entries(report.byPayment as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: paymentLabels[key] || key,
          value,
          color: paymentColors[key] || '#94A3B8',
        }))
    : [];

  const categoryData = report?.byCategory
    ? Object.entries(report.byCategory).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }))
    : [];

  const quickRanges = [
    { label: 'Hoje', start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: '7 dias', start: format(subDays(new Date(), 7), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Este mês', start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
  ];

  return (
    <div className="space-y-6">
      {/* Date filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Data inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              {quickRanges.map((range) => (
                <Button
                  key={range.label}
                  variant="outline"
                  size="sm"
                  onClick={() => { setStartDate(range.start); setEndDate(range.end); }}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando relatório...</div>
      ) : (
        <Tabs defaultValue="sales">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="operators">Operadores</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="stock">Estoque</TabsTrigger>
            <TabsTrigger value="abc">Curva ABC</TabsTrigger>
            <TabsTrigger value="cash-daily">Caixas/Dia</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(report?.summary.totalRevenue || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Número de Vendas</p>
                  <p className="text-2xl font-bold">{report?.summary.totalSales || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(report?.summary.avgTicket || 0)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales by day chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={report?.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(new Date(v + 'T00:00:00'), 'dd/MM')}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => formatDateShort(label + 'T00:00:00')}
                    />
                    <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment methods & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {paymentData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendas por Operador</CardTitle>
              </CardHeader>
              <CardContent>
                {report?.byOperator && (report.byOperator as any[]).length > 0 ? (
                  <div className="space-y-4">
                    {(report.byOperator as any[]).map((op: any, i: number) => (
                      <div key={i} className="p-4 border border-border rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{op.name}</p>
                            <p className="text-xs text-muted-foreground">{op.count} {op.count === 1 ? 'venda' : 'vendas'}</p>
                          </div>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(op.total)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-xs text-muted-foreground">Dinheiro</p>
                            <p className="font-bold text-sm text-green-700 dark:text-green-300">{formatCurrency(op.byPayment?.CASH || 0)}</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs text-muted-foreground">Cartão</p>
                            <p className="font-bold text-sm text-blue-700 dark:text-blue-300">{formatCurrency(op.byPayment?.CARD || 0)}</p>
                          </div>
                          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <p className="text-xs text-muted-foreground">Pix</p>
                            <p className="font-bold text-sm text-yellow-700 dark:text-yellow-300">{formatCurrency(op.byPayment?.PIX || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produtos Mais Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {report?.topProducts && report.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {report.topProducts.map((product, i) => (
                      <div key={product.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-muted-foreground">{product.quantity} un.</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(product.total / (report.topProducts[0]?.total || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="font-bold text-sm w-24 text-right">{formatCurrency(product.total)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            {stockReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total de produtos</p>
                      <p className="text-2xl font-bold">{stockReport.summary.totalProducts}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Estoque baixo</p>
                      <p className="text-2xl font-bold text-orange-500">{stockReport.summary.lowStockCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Sem estoque</p>
                      <p className="text-2xl font-bold text-red-500">{stockReport.summary.outOfStockCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Valor total</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stockReport.summary.totalValue)}</p>
                    </CardContent>
                  </Card>
                </div>

                {stockReport.lowStock.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-orange-600">Produtos com Estoque Baixo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-2 text-muted-foreground">Produto</th>
                              <th className="text-left p-2 text-muted-foreground">Categoria</th>
                              <th className="text-center p-2 text-muted-foreground">Estoque</th>
                              <th className="text-center p-2 text-muted-foreground">Mínimo</th>
                              <th className="text-right p-2 text-muted-foreground">Preço</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockReport.lowStock.map((p: any) => (
                              <tr key={p.id} className="border-b border-border/50">
                                <td className="p-2 font-medium">{p.name}</td>
                                <td className="p-2 text-muted-foreground">{p.category}</td>
                                <td className={`p-2 text-center font-bold ${p.stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                                  {p.stock}
                                </td>
                                <td className="p-2 text-center text-muted-foreground">{p.minStock}</td>
                                <td className="p-2 text-right">{formatCurrency(p.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ABC Curve Tab */}
          <TabsContent value="abc" className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {abcReport?.summary && (['A', 'B', 'C'] as const).map(cls => {
                const colorMap: Record<string, string> = {
                  A: 'bg-green-100 text-green-700',
                  B: 'bg-blue-100 text-blue-700',
                  C: 'bg-orange-100 text-orange-700',
                };
                const data = abcReport.summary[cls];
                return (
                  <Card key={cls}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${colorMap[cls]}`}>
                          Classe {cls}
                        </span>
                      </div>
                      <p className="text-lg font-bold">{data.count} produtos</p>
                      <p className="text-sm text-green-600 font-medium">{formatCurrency(data.revenue)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Products table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produtos por Curva ABC</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {abcReport?.items && abcReport.items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-muted-foreground">#</th>
                        <th className="text-left p-3 text-muted-foreground">Produto</th>
                        <th className="text-left p-3 text-muted-foreground">Classe</th>
                        <th className="text-right p-3 text-muted-foreground">Receita</th>
                        <th className="text-right p-3 text-muted-foreground">%</th>
                        <th className="text-right p-3 text-muted-foreground">Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abcReport.items.map((item: any, i: number) => (
                        <tr key={item.productId} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              item.class === 'A' ? 'bg-green-100 text-green-700' :
                              item.class === 'B' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>{item.class}</span>
                          </td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.revenue)}</td>
                          <td className="p-3 text-right text-muted-foreground">{item.revenuePct.toFixed(1)}%</td>
                          <td className="p-3 text-right text-muted-foreground">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Daily Tab */}
          <TabsContent value="cash-daily" className="space-y-4">
            {cashDailyReport?.registers && cashDailyReport.registers.length > 0 ? (
              cashDailyReport.registers.map((reg: any) => (
                <Card key={reg.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {formatDate(reg.openedAt)}
                        {reg.closedAt && <span className="text-muted-foreground font-normal text-sm ml-2">— fechado {formatDate(reg.closedAt)}</span>}
                      </CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        reg.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {reg.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Operador: {reg.operator?.name || '—'}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Totals row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total de Vendas</p>
                        <p className="font-bold text-green-600">{formatCurrency(reg.salesTotal)}</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Dinheiro</p>
                        <p className="font-bold text-green-700 dark:text-green-300">{formatCurrency(reg.byPayment?.CASH || 0)}</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Cartão</p>
                        <p className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(reg.byPayment?.CARD || 0)}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Pix</p>
                        <p className="font-bold text-yellow-700 dark:text-yellow-300">{formatCurrency(reg.byPayment?.PIX || 0)}</p>
                      </div>
                    </div>

                    {/* By operator */}
                    {reg.byOperator && reg.byOperator.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Por operador</p>
                        <div className="space-y-2">
                          {reg.byOperator.map((op: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-foreground">{op.name}</span>
                              <span className="font-medium text-green-600">{formatCurrency(op.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Difference if closed */}
                    {reg.status === 'CLOSED' && reg.difference !== null && reg.difference !== undefined && (
                      <div className={`text-sm p-2 rounded-lg ${
                        reg.difference === 0 ? 'bg-green-50 text-green-700' :
                        reg.difference > 0 ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        Diferença de fechamento: {reg.difference >= 0 ? '+' : ''}{formatCurrency(reg.difference)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum caixa encontrado no período
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
