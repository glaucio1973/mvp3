import React, { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, DollarSign, Package, BarChart3, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Produtos',
  '/products/new': 'Novo Produto',
  '/sales': 'PDV — Ponto de Venda',
  '/cash': 'Controle de Caixa',
  '/reports': 'Relatórios',
  '/users': 'Usuários',
  '/settings': 'Configurações',
};

const mobileNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/sales', icon: ShoppingCart, label: 'PDV' },
  { to: '/cash', icon: DollarSign, label: 'Caixa' },
  { to: '/products', icon: Package, label: 'Produtos' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();

  const title = routeTitles[location.pathname] || 'Cantina Bola de Neve';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="relative flex-shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* Pulpit watermark — behind all content */}
        <div className="bdn-watermark" aria-hidden="true" />

        <Header title={title} onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="relative z-10 flex-1 overflow-y-auto p-3 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="flex">
          {mobileNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-[#1B2F6E] dark:text-blue-400' : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn('p-1.5 rounded-xl transition-colors', isActive && 'bg-[#1B2F6E]/10 dark:bg-blue-400/20')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {label}
                </>
              )}
            </NavLink>
          ))}
          {/* More button opens sidebar */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-muted-foreground"
          >
            <div className="p-1.5 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            Mais
          </button>
        </div>
      </nav>
    </div>
  );
}
