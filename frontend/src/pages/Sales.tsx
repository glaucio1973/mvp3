import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, X, CheckCircle, Package,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Product, PaymentMethod } from '../types';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../utils/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'CASH', label: 'Dinheiro', icon: Banknote },
  { value: 'CARD', label: 'Cartão', icon: CreditCard },
  { value: 'PIX', label: 'Pix', icon: Smartphone },
];

export default function Sales() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [successSale, setSuccessSale] = useState<any>(null);
  const queryClient = useQueryClient();

  const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCartStore();
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-active', search, category],
    queryFn: () =>
      api.get('/products', {
        params: {
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
        },
      }).then((r) => r.data.filter((p: Product) => p.active && p.stock > 0)),
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then((r) => r.data),
  });

  const { data: currentCash } = useQuery({
    queryKey: ['cash-current'],
    queryFn: () => api.get('/cash/current').then((r) => r.data),
  });

  const saleMutation = useMutation({
    mutationFn: (data: any) => api.post('/sales', data),
    onSuccess: (response) => {
      setSuccessSale(response.data);
      clearCart();
      setCartOpen(false);
      setCheckoutStep(false);
      setCashAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['products-active'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cash-current'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao realizar venda');
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) { toast.error('Adicione itens ao carrinho'); return; }
    saleMutation.mutate({
      items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod,
      notes,
      cashRegisterId: currentCash?.id || null,
    });
  };

  const change = paymentMethod === 'CASH' && cashAmount ? parseFloat(cashAmount) - total : null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:flex-row lg:gap-4">
      {/* === Left: Products panel === */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search & filters */}
        <div className="flex gap-2 mb-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Todas</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {products.map((product) => {
                const cartItem = items.find(i => i.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => { addItem(product); toast.success(`${product.name} adicionado`, { duration: 800 }); }}
                    className="relative text-left bg-white dark:bg-gray-900 border border-border rounded-xl p-3 hover:border-[#1B2F6E]/70 hover:shadow-md active:scale-95 transition-all"
                  >
                    <div className="h-16 sm:h-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-7 h-7 text-blue-300" />
                      )}
                    </div>
                    {cartItem && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#1B2F6E] rounded-full flex items-center justify-center shadow">
                        <span className="text-white text-xs font-bold">{cartItem.quantity}</span>
                      </div>
                    )}
                    <p className="text-xs font-semibold text-foreground truncate leading-tight">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{product.category}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-bold text-[#1B2F6E]">{formatCurrency(product.price)}</p>
                      <p className="text-[10px] text-muted-foreground">{product.stock}un</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* === Mobile: Floating cart bar === */}
      {itemCount > 0 && !cartOpen && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between bg-[#1B2F6E] text-white rounded-2xl px-5 py-3.5 shadow-2xl active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* === Mobile: Cart bottom sheet === */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
              <h2 className="font-bold text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Carrinho
              </h2>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-500 font-medium">Limpar</button>
                )}
                <button onClick={() => setCartOpen(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!checkoutStep ? (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} un.</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted active:scale-90 transition-transform"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted active:scale-90 transition-transform"
                          onClick={() => {
                            if (item.quantity >= item.product.stock) { toast.error('Estoque máximo'); return; }
                            updateQuantity(item.product.id, item.quantity + 1);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-bold w-16 text-right">{formatCurrency(item.product.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-6 pt-3 border-t border-border space-y-3">
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-[#1B2F6E] text-xl">{formatCurrency(total)}</span>
                  </div>
                  <Button className="w-full h-12 text-base gap-2 rounded-xl" onClick={() => setCheckoutStep(true)}>
                    <CreditCard className="w-5 h-5" /> Ir para Pagamento
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setCheckoutStep(false)} className="text-sm text-muted-foreground hover:text-foreground">← voltar</button>
                  <h3 className="font-semibold">Forma de Pagamento</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        paymentMethod === value
                          ? 'border-[#1B2F6E] bg-blue-50 dark:bg-blue-900/30 text-[#1B2F6E]'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'CASH' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Valor recebido (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="text-lg h-12"
                    />
                    {change !== null && change >= 0 && (
                      <div className="flex justify-between bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-semibold">
                        <span>Troco:</span><span>{formatCurrency(change)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Observação (opcional)</label>
                  <Input placeholder="Ex: mesa 3, pedido especial..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="pb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>Total a pagar:</span>
                    <span className="text-foreground font-bold text-lg">{formatCurrency(total)}</span>
                  </div>
                  <Button
                    className="w-full h-12 text-base gap-2 rounded-xl"
                    onClick={handleCheckout}
                    disabled={saleMutation.isPending}
                  >
                    {saleMutation.isPending ? 'Processando...' : <><CheckCircle className="w-5 h-5" /> Confirmar Venda</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Desktop: Cart sidebar === */}
      <div className="hidden lg:flex w-80 flex-col bg-white dark:bg-gray-900 border border-border rounded-xl overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <ShoppingCart className="w-4 h-4" /> Carrinho
            {itemCount > 0 && <Badge className="ml-1">{itemCount}</Badge>}
          </h2>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 font-medium">Limpar</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Carrinho vazio</p>
              <p className="text-xs opacity-70">Clique em um produto</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => {
                    if (item.quantity >= item.product.stock) { toast.error('Estoque máximo'); return; }
                    updateQuantity(item.product.id, item.quantity + 1);
                  }}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeItem(item.product.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs font-bold w-14 text-right">{formatCurrency(item.product.price * item.quantity)}</p>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Total</span>
              <span className="text-xl font-bold text-[#1B2F6E]">{formatCurrency(total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {paymentMethods.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === value
                      ? 'border-[#1B2F6E] bg-blue-50 dark:bg-blue-900/30 text-[#1B2F6E]'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            {paymentMethod === 'CASH' && (
              <Input type="number" step="0.01" placeholder="Valor recebido (R$)" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="text-sm" />
            )}
            {change !== null && change >= 0 && (
              <div className="flex justify-between text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                <span className="text-green-700 dark:text-green-300 font-medium">Troco:</span>
                <span className="text-green-700 dark:text-green-300 font-bold">{formatCurrency(change)}</span>
              </div>
            )}
            <Button className="w-full gap-2" onClick={handleCheckout} disabled={saleMutation.isPending}>
              {saleMutation.isPending ? 'Processando...' : <><CheckCircle className="w-4 h-4" />Finalizar Venda</>}
            </Button>
          </div>
        )}
      </div>

      {/* === Success modal === */}
      {successSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-1">Venda Realizada!</h2>
            <p className="text-2xl font-bold text-[#1B2F6E] mb-4">{formatCurrency(successSale.total)}</p>
            <div className="text-left space-y-1 mb-6 text-sm">
              {successSale.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span>{item.product?.name} × {item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setSuccessSale(null)} className="w-full h-12 text-base rounded-xl">
              Nova Venda
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
