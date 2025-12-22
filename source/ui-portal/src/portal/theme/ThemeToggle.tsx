import { Button } from '@/portal/ui/Button';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <Button variant="ghost" size="sm" onClick={() => setTheme(next)}>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}


