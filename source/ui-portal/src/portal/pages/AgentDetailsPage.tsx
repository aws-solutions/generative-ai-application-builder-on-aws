import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getDeploymentDetails } from '@/portal/api/deployments';
import { Card, CardContent, CardHeader, CardTitle } from '@/portal/ui/Card';
import { Badge } from '@/portal/ui/Badge';

function ToolsList({ tools }: { tools?: Array<{ ToolId: string }> }) {
  const ids = (tools ?? []).map((t) => t?.ToolId).filter(Boolean);
  if (ids.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <Badge key={id} variant="default">
          {id}
        </Badge>
      ))}
    </div>
  );
}

export function AgentDetailsPage() {
  const { useCaseId, useCaseType } = useParams();
  const q = useQuery({
    queryKey: ['portalDeploymentDetails', useCaseId, useCaseType],
    queryFn: async () => {
      if (!useCaseId) throw new Error('Missing useCaseId');
      return await getDeploymentDetails(useCaseId, useCaseType);
    },
    enabled: Boolean(useCaseId),
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const d: any = q.data;
  const hasWeb = Boolean(d?.cloudFrontWebUrl);
  const hasVoice = Boolean(d?.VoicePhoneNumber?.trim?.());
  const status = d?.status ?? d?.Status ?? 'unknown';
  const model =
    d?.LlmParams?.BedrockLlmParams?.InferenceProfileId ??
    d?.LlmParams?.BedrockLlmParams?.ModelId ??
    d?.ModelProviderName ??
    '-';
  const systemPrompt =
    d?.AgentBuilderParams?.SystemPrompt ??
    d?.WorkflowParams?.SystemPrompt ??
    '-';
  const tools =
    d?.AgentBuilderParams?.Tools ??
    d?.WorkflowParams?.AgentsAsToolsParams?.Agents ??
    undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link to="/app/agents" className="hover:underline">
              Agents
            </Link>{' '}
            / {d?.UseCaseName ?? 'Details'}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{d?.UseCaseName ?? 'Deployment'}</h1>
        </div>
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : q.isError ? (
        <div className="text-sm text-red-600">Failed to load details.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span>{status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enabled Channels</span>
                <div className="flex gap-2">
                  {hasWeb && <Badge variant="blue">Web</Badge>}
                  {hasVoice && <Badge variant="green">Voice</Badge>}
                  {!hasWeb && !hasVoice && <span className="text-muted-foreground">-</span>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Voice Phone</span>
                <span>{d?.VoicePhoneNumber?.trim?.() ? d.VoicePhoneNumber : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="max-w-[22rem] truncate" title={model}>
                  {model}
                </span>
              </div>
              <div className="space-y-2">
                <span className="text-muted-foreground">Capabilities / Tools</span>
                <ToolsList tools={d?.AgentBuilderParams?.Tools} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[420px] whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-xs text-foreground">
                {systemPrompt}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


