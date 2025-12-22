import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import type { RuntimeConfig } from '@/portal/runtime/runtimeConfig';
import { LoginPage } from '@/portal/pages/LoginPage';
import { AppShell } from '@/portal/pages/AppShell';
import { AgentsListPage } from '@/portal/pages/AgentsListPage';
import { AgentDetailsPage } from '@/portal/pages/AgentDetailsPage';
import { UsagePage } from '@/portal/pages/UsagePage';
import { SettingsPage } from '@/portal/pages/SettingsPage';

export function App({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Auth.currentAuthenticatedUser()
      .then((u) => mounted && setUser(u))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [runtimeConfig.UserPoolId, runtimeConfig.UserPoolClientId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app/agents" replace /> : <LoginPage />} />
      <Route path="/app" element={user ? <AppShell /> : <Navigate to="/" replace />}>
        <Route path="agents" element={<AgentsListPage />} />
        <Route path="agents/:useCaseType/:useCaseId" element={<AgentDetailsPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


