import React, { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Upload, X, Package } from 'lucide-react';
import api from '../utils/api';
import { Product } from '../types';
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

const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().min(1, 'Categoria obrigatória'),
  sku: z.string().min(1, 'SKU obrigatório'),
  description: z.string().optional(),
  price: z.string().min(1, 'Preço obrigatório'),
  stock: z.string().optional(),
  minStock: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductFormModal({ product, onClose, onSuccess }: ProductFormModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      category: product?.category || '',
      sku: product?.sku || '',
      description: product?.description || '',
      price: product?.price.toString() || '',
      stock: product?.stock.toString() || '0',
      minStock: product?.minStock.toString() || '5',
    },
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (product) {
        return api.put(`/products/${product.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success(product ? 'Produto atualizado!' : 'Produto criado!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao salvar produto');
    },
  });

  const onSubmit = (data: ProductFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string);
      }
    });
    if (imageFile) {
      formData.append('image', imageFile);
    }
    mutation.mutate(formData);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagem do produto</Label>
            <div
              className="relative border-2 border-dashed border-border rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1 hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para adicionar imagem</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <div className="flex gap-2">
                <Input
                  id="category"
                  list="categories"
                  {...register('category')}
                  className={errors.category ? 'border-red-500' : ''}
                  placeholder="Ex: Bebidas"
                />
                <datalist id="categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" {...register('sku')} className={errors.sku ? 'border-red-500' : ''} placeholder="BEB001" />
              {errors.sku && <p className="text-xs text-red-500">{errors.sku.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price')}
                className={errors.price ? 'border-red-500' : ''}
                placeholder="0.00"
              />
              {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
            </div>

            {!product && (
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque inicial</Label>
                <Input id="stock" type="number" min="0" {...register('stock')} placeholder="0" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="minStock">Estoque mínimo</Label>
              <Input id="minStock" type="number" min="0" {...register('minStock')} placeholder="5" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} rows={2} placeholder="Descrição opcional..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : product ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
