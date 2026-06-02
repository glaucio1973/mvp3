import { create } from 'zustand';
import { CartItem, Product } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,

  addItem: (product: Product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = state.items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newItems = [...state.items, { product, quantity: 1 }];
      }
      const total = newItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      return { items: newItems, total };
    });
  },

  removeItem: (productId: string) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.product.id !== productId);
      const total = newItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      return { items: newItems, total };
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter((i) => i.product.id !== productId);
        const total = newItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        return { items: newItems, total };
      }
      const newItems = state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      );
      const total = newItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      return { items: newItems, total };
    });
  },

  clearCart: () => set({ items: [], total: 0 }),
}));
