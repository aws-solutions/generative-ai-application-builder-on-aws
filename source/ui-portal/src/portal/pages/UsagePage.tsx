import { Card, CardContent, CardHeader, CardTitle } from '@/portal/ui/Card';

export function UsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voice KPIs first, chat/web metering next.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          We’ll surface per-agent voice conversations (turns, duration, end reason) and later add chat token/time
          metering with margin reporting.
        </CardContent>
      </Card>
    </div>
  );
}


