import React from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { Button } from '../ui/button';

interface HeaderProps {
  title: string;
  onMobileMenuOpen: () => void;
}

export default function Header({ title, onMobileMenuOpen }: HeaderProps) {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden -ml-1" onClick={onMobileMenuOpen}>
          <Menu className="w-5 h-5" />
        </Button>
        {/* Mobile: show logo next to title */}
        <img
          src="/bdn-logo.svg"
          alt=""
          className="lg:hidden w-6 h-6 opacity-80"
          style={{ filter: 'none' }}
        />
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Desktop subtle logo in header */}
        <span className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground/60 mr-2">
          <img src="/bdn-logo.svg" alt="" className="w-5 h-5 opacity-50" />
          Bola de Neve
        </span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
