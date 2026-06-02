import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Lock,
  Unlock,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Clock,
  History,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { CashRegister as CashRegisterType } from '../types';
import { formatCurrency, formatDate, paymentMethodLabel } from '../utils/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

function OpenCashModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [initialValue, setInitialValue] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/cash/open', { initialValue: parseFloat(initialValue) }),
    onSuccess: () => { toast.success('Caixa aberto com sucesso!'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao abrir caixa'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor inicial (fundo de caixa)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={initialValue}
              onChange={(e) => setInitialValue(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={() => mutation.mutate()} className="flex-1" disabled={mutation.isPending || !initialValue}>
              {mutation.isPending ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CloseCashModal({ cash, onClose, onSuccess }: { cash: CashRegisterType; onClose: () => void; onSuccess: () => void }) {
  const [finalValue, setFinalValue] = useState('');
  const [closedData, setClosedData] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: () => api.put(`/cash/${cash.id}/close`, { finalValue: parseFloat(finalValue) }),
    onSuccess: (res) => {
      setClosedData(res.data);
      toast.success('Caixa fechado com sucesso!');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao fechar caixa'),
  });

  const diff = finalValue ? parseFloat(finalValue) - (cash.currentTotal || 0) : null;

  const totalByPayment = (pm: string) =>
    cash.sales?.filter(s => s.paymentMethod === pm && s.status !== 'CANCELLED').reduce((sum, s) => sum + s.total, 0) || 0;

  if (closedData) {
    return (
      <Dialog open onOpenChange={() => { onSuccess(); }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Resumo do Fechamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Fundo inicial:</span><span>{formatCurrency(closedData.initialValue)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Esperado:</span><span>{formatCurrency(closedData.expectedValue || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Informado:</span><span>{formatCurrency(closedData.finalValue || 0)}</span></div>
              <div className={`flex justify-between font-bold border-t border-border pt-2 ${(closedData.difference || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                <span>Diferença:</span>
                <span>{(closedData.difference || 0) >= 0 ? '+' : ''}{formatCurrency(closedData.difference || 0)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold">Vendas por pagamento</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ key: 'CASH', label: 'Dinheiro', color: 'green' }, { key: 'CARD', label: 'Cartão', color: 'blue' }, { key: 'PIX', label: 'Pix', color: 'yellow' }].map(({ key, label, color }) => (
                  <div key={key} className={`text-center p-2 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg`}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`font-bold text-sm text-${color}-700 dark:text-${color}-300`}>{formatCurrency(closedData.byPayment?.[key] || 0)}</p>
                  </div>
                ))}
              </div>
            </div>

            {closedData.byOperator && closedData.byOperator.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Vendas por operador</p>
                {closedData.byOperator.map((op: any, i: number) => (
                  <div key={i} className="p-3 border border-border rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{op.name}</span>
                      <span className="font-bold text-green-600">{formatCurrency(op.total)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-center">
                      <div className="bg-muted rounded p-1"><p className="text-muted-foreground">Dinheiro</p><p className="font-medium">{formatCurrency(op.byPayment?.CASH || 0)}</p></div>
                      <div className="bg-muted rounded p-1"><p className="text-muted-foreground">Cartão</p><p className="font-medium">{formatCurrency(op.byPayment?.CARD || 0)}</p></div>
                      <div className="bg-muted rounded p-1"><p className="text-muted-foreground">Pix</p><p className="font-medium">{formatCurrency(op.byPayment?.PIX || 0)}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={onSuccess}>Concluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Fundo inicial:</span><span>{formatCurrency(cash.initialValue)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dinheiro (vendas):</span><span className="text-green-600">{formatCurrency(totalByPayment('CASH'))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cartão:</span><span className="text-blue-600">{formatCurrency(totalByPayment('CARD'))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pix:</span><span className="text-yellow-600">{formatCurrency(totalByPayment('PIX'))}</span></div>
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Esperado em caixa:</span>
              <span>{formatCurrency(cash.currentTotal || 0)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor encontrado no caixa</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={finalValue}
              onChange={(e) => setFinalValue(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>

          {diff !== null && (
            <div className={`p-3 rounded-lg text-sm font-medium ${diff >= 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
              Diferença: {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              {diff < 0 && ' (falta dinheiro)'}
              {diff > 0 && ' (sobrou dinheiro)'}
              {diff === 0 && ' (conferido!)'}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={() => mutation.mutate()} className="flex-1" disabled={mutation.isPending || !finalValue}>
              {mutation.isPending ? 'Fechando...' : 'Fechar Caixa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MovementModal({ cashId, onClose, onSuccess }: { cashId: string; onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/cash/${cashId}/movements`, { type, amount: parseFloat(amount), description }),
    onSuccess: () => { toast.success('Movimento registrado!'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao registrar movimento'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Registrar Movimento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setType('ENTRY')}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${type === 'ENTRY' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'border-border hover:bg-muted'}`}
            >
              <TrendingUp className="w-4 h-4" /> Entrada
            </button>
            <button
              onClick={() => setType('EXIT')}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${type === 'EXIT' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'border-border hover:bg-muted'}`}
            >
              <TrendingDown className="w-4 h-4" /> Saída
            </button>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Troco inicial, pagamento fornecedor..." />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={() => mutation.mutate()} className="flex-1" disabled={mutation.isPending || !amount || !description}>
              {mutation.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CashRegister() {
  const [openModal, setOpenModal] = useState<'open' | 'close' | 'movement' | null>(null);
  const queryClient = useQueryClient();

  const { data: currentCash, isLoading } = useQuery<CashRegisterType | null>({
    queryKey: ['cash-current'],
    queryFn: () => api.get('/cash/current').then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: history } = useQuery<{ registers: CashRegisterType[] }>({
    queryKey: ['cash-history'],
    queryFn: () => api.get('/cash/history').then((r) => r.data),
  });

  const handleSuccess = () => {
    setOpenModal(null);
    queryClient.invalidateQueries({ queryKey: ['cash-current'] });
    queryClient.invalidateQueries({ queryKey: ['cash-history'] });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Cash Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Card */}
        <Card className={`col-span-1 ${currentCash ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${currentCash ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                {currentCash ? (
                  <Unlock className="w-7 h-7 text-green-600 dark:text-green-400" />
                ) : (
                  <Lock className="w-7 h-7 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status do Caixa</p>
                <p className="text-xl font-bold">{currentCash ? 'Aberto' : 'Fechado'}</p>
                {currentCash && (
                  <p className="text-xs text-muted-foreground">
                    Por: {currentCash.operator.name}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {!currentCash ? (
                <Button className="flex-1 gap-2" onClick={() => setOpenModal('open')}>
                  <Unlock className="w-4 h-4" /> Abrir Caixa
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setOpenModal('movement')}
                  >
                    <Plus className="w-4 h-4" /> Movimento
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => setOpenModal('close')}
                  >
                    <Lock className="w-4 h-4" /> Fechar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current totals */}
        {currentCash && (
          <>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total em Vendas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(currentCash.totalSales || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{currentCash.sales?.length || 0} vendas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Dinheiro em Caixa</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(currentCash.currentTotal || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Fundo: {formatCurrency(currentCash.initialValue)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs: Sales and Movements */}
      {currentCash && (
        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">Vendas ({currentCash.sales?.length || 0})</TabsTrigger>
            <TabsTrigger value="movements">Movimentos ({currentCash.movements?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground font-medium">Horário</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Pagamento</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Itens</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCash.sales?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted-foreground p-8">Nenhuma venda neste caixa</td>
                        </tr>
                      ) : currentCash.sales?.map((sale) => (
                        <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDate(sale.createdAt)}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{paymentMethodLabel[sale.paymentMethod as keyof typeof paymentMethodLabel]}</Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">{sale.items?.length || 0} items</td>
                          <td className="p-4 text-right font-bold text-green-600">{formatCurrency(sale.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-muted-foreground font-medium">Horário</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Tipo</th>
                        <th className="text-left p-4 text-muted-foreground font-medium">Descrição</th>
                        <th className="text-right p-4 text-muted-foreground font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCash.movements?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted-foreground p-8">Nenhum movimento registrado</td>
                        </tr>
                      ) : currentCash.movements?.map((movement) => (
                        <tr key={movement.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-4 text-xs text-muted-foreground">{formatDate(movement.createdAt)}</td>
                          <td className="p-4">
                            <Badge variant={movement.type === 'ENTRY' ? 'success' : 'destructive'}>
                              {movement.type === 'ENTRY' ? 'Entrada' : 'Saída'}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">{movement.description}</td>
                          <td className={`p-4 text-right font-bold ${movement.type === 'ENTRY' ? 'text-green-600' : 'text-red-500'}`}>
                            {movement.type === 'EXIT' ? '-' : '+'}{formatCurrency(movement.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* History */}
      {history && history.registers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Caixas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Abertura</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Fechamento</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Operador</th>
                    <th className="text-right p-4 text-muted-foreground font-medium">Diferença</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.registers.slice(0, 10).map((reg) => (
                    <tr key={reg.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4 text-xs">{formatDate(reg.openedAt)}</td>
                      <td className="p-4 text-xs">{reg.closedAt ? formatDate(reg.closedAt) : '—'}</td>
                      <td className="p-4">{reg.operator.name}</td>
                      <td className={`p-4 text-right font-medium ${reg.difference !== null && reg.difference !== undefined ? (reg.difference >= 0 ? 'text-green-600' : 'text-red-500') : ''}`}>
                        {reg.difference !== null && reg.difference !== undefined ? (
                          <>{reg.difference >= 0 ? '+' : ''}{formatCurrency(reg.difference)}</>
                        ) : '—'}
                      </td>
                      <td className="p-4">
                        <Badge variant={reg.status === 'OPEN' ? 'success' : 'secondary'}>
                          {reg.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {openModal === 'open' && (
        <OpenCashModal onClose={() => setOpenModal(null)} onSuccess={handleSuccess} />
      )}
      {openModal === 'close' && currentCash && (
        <CloseCashModal cash={currentCash} onClose={() => setOpenModal(null)} onSuccess={handleSuccess} />
      )}
      {openModal === 'movement' && currentCash && (
        <MovementModal cashId={currentCash.id} onClose={() => setOpenModal(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
