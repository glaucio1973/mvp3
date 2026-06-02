import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Produtos',
  '/products/new': 'Novo Produto',
  '/sales': 'PDV - Ponto de Venda',
  '/cash': 'Controle de Caixa',
  '/reports': 'Relatórios',
  '/users': 'Usuários',
  '/settings': 'Configurações',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = routeTitles[location.pathname] || 'Cantina Bola de Neve';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="relative flex-shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={title} onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
