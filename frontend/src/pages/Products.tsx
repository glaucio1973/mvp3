import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Product } from '../types';
import { formatCurrency } from '../utils/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useAuthStore } from '../store/authStore';
import StockModal from '../components/StockModal';
import ProductFormModal from '../components/ProductFormModal';

export default function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', search, category, lowStockOnly],
    queryFn: () =>
      api.get('/products', {
        params: {
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
          lowStock: lowStockOnly ? 'true' : undefined,
          active: 'all',
        },
      }).then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then((r) => r.data),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (product: Product) =>
      api.put(`/products/${product.id}`, { active: !product.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado');
    },
    onError: () => toast.error('Erro ao atualizar produto'),
  });

  const activeProducts = products.filter(p => p.active);
  const inactiveProducts = products.filter(p => !p.active);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
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
            <option value="all">Todas categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <Button
            variant={lowStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Estoque baixo
          </Button>
        </div>

        {isAdmin && (
          <Button onClick={() => { setSelectedProduct(null); setFormModalOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo produto
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{activeProducts.length} ativos</span>
        <span>•</span>
        <span>{products.filter(p => p.stock <= p.minStock && p.active).length} com estoque baixo</span>
        <span>•</span>
        <span>{products.filter(p => p.stock === 0).length} sem estoque</span>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const isLow = product.stock <= product.minStock;
            const isOut = product.stock === 0;
            return (
              <Card key={product.id} className={`overflow-hidden transition-all hover:shadow-md ${!product.active ? 'opacity-60' : ''}`}>
                {/* Image */}
                <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-blue-300 dark:text-gray-500" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {!product.active && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                    {isOut && product.active && (
                      <Badge variant="destructive" className="text-xs">Sem estoque</Badge>
                    )}
                    {isLow && !isOut && product.active && (
                      <Badge variant="warning" className="text-xs">Estoque baixo</Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-3">
                  <div className="mb-2">
                    <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category} • {product.sku}</p>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-lg font-bold text-[#1B2F6E]">{formatCurrency(product.price)}</p>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-green-600'}`}>
                        {product.stock} un.
                      </p>
                      <p className="text-xs text-muted-foreground">Mín: {product.minStock}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs"
                      onClick={() => { setSelectedProduct(product); setStockModalOpen(true); }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Estoque
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => { setSelectedProduct(product); setFormModalOpen(true); }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className={`h-9 w-9 ${product.active ? 'hover:text-red-500' : 'hover:text-green-500'}`}
                          onClick={() => toggleActiveMutation.mutate(product)}
                        >
                          {product.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {stockModalOpen && selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() => { setStockModalOpen(false); setSelectedProduct(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setStockModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {formModalOpen && (
        <ProductFormModal
          product={selectedProduct}
          onClose={() => { setFormModalOpen(false); setSelectedProduct(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setFormModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
