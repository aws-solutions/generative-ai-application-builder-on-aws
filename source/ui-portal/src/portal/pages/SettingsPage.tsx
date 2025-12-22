import { Card, CardContent, CardHeader, CardTitle } from '@/portal/ui/Card';
import { Button } from '@/portal/ui/Button';
import { useTheme } from '@/portal/theme/ThemeProvider';

export function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personal preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="text-muted-foreground">
            Current: <span className="font-medium text-foreground">{theme}</span> (resolved: {resolvedTheme})
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setTheme('light')}>Light</Button>
            <Button variant="secondary" size="sm" onClick={() => setTheme('dark')}>Dark</Button>
            <Button variant="secondary" size="sm" onClick={() => setTheme('system')}>System</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


