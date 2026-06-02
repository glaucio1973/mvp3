import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';
import api from '../utils/api';
import { Product } from '../types';
import { formatCurrency } from '../utils/format';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface StockModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockModal({ product, onClose, onSuccess }: StockModalProps) {
  const [type, setType] = useState<'ENTRY' | 'EXIT' | 'ADJUSTMENT'>('ENTRY');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/products/${product.id}/stock`, { type, quantity: parseInt(quantity), notes }),
    onSuccess: (data) => {
      toast.success(`Estoque atualizado! Novo estoque: ${data.data.newStock} un.`);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao ajustar estoque');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    mutation.mutate();
  };

  const typeLabels = {
    ENTRY: { label: 'Entrada', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    EXIT: { label: 'Saída', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    ADJUSTMENT: { label: 'Ajuste', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar Estoque</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              Estoque atual: <strong>{product.stock}</strong> un. • {formatCurrency(product.price)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de movimento</Label>
            <div className="flex gap-2">
              {(['ENTRY', 'EXIT', 'ADJUSTMENT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium border transition-all ${
                    type === t
                      ? typeLabels[t].color + ' border-current'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {typeLabels[t].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {type === 'ADJUSTMENT' ? 'Novo estoque (quantidade total)' : 'Quantidade'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Recebimento de mercadoria, ajuste de inventário..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
