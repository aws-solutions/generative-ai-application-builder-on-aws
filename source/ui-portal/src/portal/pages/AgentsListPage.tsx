import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listMyDeployments, type DeploymentListItem } from '@/portal/api/deployments';
import { Card, CardContent } from '@/portal/ui/Card';
import { Badge } from '@/portal/ui/Badge';

function Channels({ d }: { d: DeploymentListItem }) {
  const hasWeb = Boolean(d.cloudFrontWebUrl);
  const hasVoice = Boolean(d.VoicePhoneNumber?.trim?.());
  if (!hasWeb && !hasVoice) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex gap-2">
      {hasWeb && <Badge variant="blue">Web</Badge>}
      {hasVoice && <Badge variant="green">Voice</Badge>}
    </div>
  );
}

export function AgentsListPage() {
  const q = useQuery({
    queryKey: ['portalDeployments', 1],
    queryFn: () => listMyDeployments(1),
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const agents = (q.data?.deployments ?? []).filter((d) => (d.status ?? '').toUpperCase() === 'CREATE_COMPLETE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent deployments you own.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {q.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : q.isError ? (
            <div className="text-sm text-red-600">Failed to load deployments.</div>
          ) : (
            <div className="divide-y divide-border">
              {agents.map((d) => (
                <div key={d.UseCaseId} className="flex items-center justify-between py-4">
                  <div>
                    <div className="text-sm font-medium">
                      <Link
                        className="hover:underline"
                        to={`/app/agents/${d.UseCaseType ?? 'Text'}/${d.UseCaseId}`}
                      >
                        {d.Name}
                      </Link>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.Description ?? ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <Channels d={d} />
                  </div>
                </div>
              ))}
              {agents.length === 0 && (
                <div className="py-6 text-sm text-muted-foreground">No agents yet.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


