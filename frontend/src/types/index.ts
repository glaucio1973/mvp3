export type Role = 'ADMIN' | 'OPERATOR';
export type PaymentMethod = 'CASH' | 'CARD' | 'PIX';
export type SaleStatus = 'COMPLETED' | 'CANCELLED';
export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
export type CashStatus = 'OPEN' | 'CLOSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  description?: string;
  imageUrl?: string;
  price: number;
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  product: Pick<Product, 'name' | 'category' | 'imageUrl'>;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  operatorId: string;
  operator: { name: string };
  cashRegisterId?: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: MovementType;
  amount: number;
  description: string;
  createdBy: string;
  user: { name: string };
  createdAt: string;
}

export interface CashRegister {
  id: string;
  operatorId: string;
  operator: { name: string };
  status: CashStatus;
  initialValue: number;
  finalValue?: number;
  expectedValue?: number;
  difference?: number;
  openedAt: string;
  closedAt?: string;
  sales: Sale[];
  movements: CashMovement[];
  currentTotal?: number;
  totalSales?: number;
}

export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  user: { name: string };
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  notes?: string;
  createdBy: string;
  user: { name: string };
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  user: { name: string; email: string };
  action: string;
  details?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DashboardData {
  period: { start: string; end: string; label: string };
  periodSales: { total: number; count: number };
  byOperator: Array<{ name: string; total: number; count: number }>;
  byPayment: Record<string, number>;
  todaySales: { total: number; count: number };
  monthSales: { total: number; count: number };
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  openCashRegister: CashRegister | null;
  recentSales: Sale[];
}

export interface SalesReport {
  summary: {
    totalRevenue: number;
    totalSales: number;
    avgTicket: number;
    period: { start: string; end: string };
  };
  byDay: Array<{ date: string; total: number; count: number }>;
  byPayment: Record<PaymentMethod, number>;
  byCategory: Record<string, number>;
  topProducts: Array<{ id: string; name: string; quantity: number; total: number }>;
  byOperator: Array<{
    name: string;
    count: number;
    total: number;
    byPayment: Record<string, number>;
  }>;
}
