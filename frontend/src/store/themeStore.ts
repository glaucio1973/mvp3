import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

const savedTheme = localStorage.getItem('theme');
const initialDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

if (initialDark) {
  document.documentElement.classList.add('dark');
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialDark,
  toggleTheme: () =>
    set((state) => {
      const newDark = !state.isDark;
      if (newDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return { isDark: newDark };
    }),
}));
