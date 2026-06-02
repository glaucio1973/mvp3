import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign,
  BarChart3, Users, Settings, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',  icon: Package,         label: 'Produtos' },
  { to: '/sales',     icon: ShoppingCart,    label: 'PDV / Vendas' },
  { to: '/cash',      icon: DollarSign,      label: 'Caixa' },
  { to: '/reports',   icon: BarChart3,       label: 'Relatórios', adminOnly: true },
  { to: '/users',     icon: Users,           label: 'Usuários',   adminOnly: true },
  { to: '/settings',  icon: Settings,        label: 'Configurações' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado');
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => !item.adminOnly || user?.role === 'ADMIN');

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#1B2F6E' }}>

      {/* Logo area */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 border-b border-white/10',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex-shrink-0">
          <img
            src="/bdn-logo.svg"
            alt="Bola de Neve"
            className={cn('transition-all', collapsed ? 'w-8 h-8' : 'w-10 h-10')}
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-white leading-tight">Cantina</p>
            <p className="text-xs text-white/60 leading-tight">Bola de Neve</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-white text-[#1B2F6E] shadow-md font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info & logout */}
      <div className={cn('p-3 border-t border-white/10', collapsed && 'flex flex-col items-center')}>
        {!collapsed && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-white/5">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] bg-white/15 text-white/80 px-2 py-0.5 rounded-full font-medium">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-white/60 hover:bg-white/10 hover:text-white transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-300 lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col h-full transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}>
        <SidebarContent />
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow z-10"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-[#1B2F6E]" />
            : <ChevronLeft className="w-3 h-3 text-[#1B2F6E]" />
          }
        </button>
      </aside>
    </>
  );
}
