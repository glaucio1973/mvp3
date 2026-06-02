import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  CheckCircle,
  Package,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Product, PaymentMethod } from '../types';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../utils/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successSale, setSuccessSale] = useState<any>(null);
  const queryClient = useQueryClient();

  const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCartStore();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-active', search, category],
    queryFn: () =>
      api.get('/products', {
        params: {
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
          active: 'true',
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
      setCheckoutOpen(false);
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
    if (items.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }
    saleMutation.mutate({
      items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod,
      notes,
      cashRegisterId: currentCash?.id || null,
    });
  };

  const change = paymentMethod === 'CASH' && cashAmount
    ? parseFloat(cashAmount) - total
    : null;

  const categoryGroups = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Products panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Todas</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="w-12 h-12 mb-3" />
              <p>Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product) => {
                const cartItem = items.find(i => i.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addItem(product)}
                    className="relative text-left bg-white dark:bg-gray-900 border border-border rounded-xl p-3 hover:border-blue-500 hover:shadow-md transition-all group"
                  >
                    {/* Image */}
                    <div className="h-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-8 h-8 text-blue-300" />
                      )}
                    </div>

                    {/* Cart badge */}
                    {cartItem && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{cartItem.quantity}</span>
                      </div>
                    )}

                    <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{product.category}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-muted-foreground">{product.stock}un</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 flex flex-col bg-white dark:bg-gray-900 border border-border rounded-xl overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Carrinho
            </h2>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-red-500 h-7">
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Carrinho vazio</p>
              <p className="text-xs">Clique em um produto para adicionar</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} un.</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (item.quantity >= item.product.stock) {
                        toast.error('Quantidade máxima atingida');
                        return;
                      }
                      updateQuantity(item.product.id, item.quantity + 1);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs font-bold text-right w-14">
                  {formatCurrency(item.product.price * item.quantity)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Total & checkout */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(total)}</span>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-1">
              {paymentMethods.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {paymentMethod === 'CASH' && (
              <Input
                type="number"
                step="0.01"
                placeholder="Valor recebido (R$)"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="text-sm"
              />
            )}

            {change !== null && change >= 0 && (
              <div className="flex justify-between text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                <span className="text-green-700 dark:text-green-300 font-medium">Troco:</span>
                <span className="text-green-700 dark:text-green-300 font-bold">{formatCurrency(change)}</span>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={handleCheckout}
              disabled={saleMutation.isPending}
            >
              {saleMutation.isPending ? 'Processando...' : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Finalizar Venda
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Success modal */}
      {successSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Venda Realizada!</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Total: <strong>{formatCurrency(successSale.total)}</strong>
            </p>
            <div className="space-y-2 mb-6">
              {successSale.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product?.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setSuccessSale(null)} className="w-full">
              Nova Venda
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
