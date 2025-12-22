import { API } from 'aws-amplify';
import { getIdToken } from '@/portal/auth/token';

const API_NAME = 'api';

export type DeploymentListItem = {
  UseCaseId: string;
  Name: string;
  Description?: string;
  CreatedDate: string;
  status?: string;
  cloudFrontWebUrl?: string;
  VoicePhoneNumber?: string;
  UseCaseType?: string;
};

export type ListDeploymentsResponse = {
  deployments: DeploymentListItem[];
  numUseCases: number;
  nextPage?: number;
};

export async function listMyDeployments(pageNumber: number = 1): Promise<ListDeploymentsResponse> {
  const token = await getIdToken();
  return await API.get(API_NAME, '/deployments', {
    headers: { Authorization: token },
    queryStringParameters: { pageNumber: String(pageNumber) }
  });
}

export async function getDeploymentDetails(useCaseId: string, useCaseType?: string): Promise<any> {
  const token = await getIdToken();
  const route = (() => {
    switch (useCaseType) {
      case 'AgentBuilder':
        return `/deployments/agents/${useCaseId}`;
      case 'Workflow':
        return `/deployments/workflows/${useCaseId}`;
      case 'MCPServer':
        return `/deployments/mcp/${useCaseId}`;
      default:
        return `/deployments/${useCaseId}`;
    }
  })();
  return await API.get(API_NAME, route, { headers: { Authorization: token } });
}


