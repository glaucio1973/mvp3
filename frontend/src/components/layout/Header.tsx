import React from 'react';
import { Menu, Moon, Sun, Bell } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { Button } from '../ui/button';

interface HeaderProps {
  title: string;
  onMobileMenuOpen: () => void;
}

export default function Header({ title, onMobileMenuOpen }: HeaderProps) {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuOpen}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>
    </header>
  );
}
