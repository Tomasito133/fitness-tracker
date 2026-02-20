import { NavLink, Outlet } from 'react-router-dom';
import { Dumbbell, Utensils, Pill, Ruler, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Главная' },
  { to: '/workouts', icon: Dumbbell, label: 'Тренировки' },
  { to: '/nutrition', icon: Utensils, label: 'Питание' },
  { to: '/supplements', icon: Pill, label: 'БАДы' },
  { to: '/body', icon: Ruler, label: 'Замеры' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const nextTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={nextTheme}
      className="p-2 rounded-lg hover:bg-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      title={`Тема: ${theme === 'light' ? 'Светлая' : 'Тёмная'}`}
    >
      {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export function Layout() {
  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
        <div className="container flex h-14 items-center justify-between px-4 max-w-full">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">FitTrack</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] max-w-full overflow-x-hidden min-h-0">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)]">
        <div className="container flex h-16 items-center justify-around px-2 max-w-full">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
