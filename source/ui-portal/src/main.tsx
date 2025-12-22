import '@/polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@/styles.css';
import { App } from '@/portal/App';
import { ThemeProvider } from '@/portal/theme/ThemeProvider';
import { constructAmplifyConfig, getRuntimeConfig } from '@/portal/runtime/runtimeConfig';

const queryClient = new QueryClient();

async function bootstrap() {
  const config = await getRuntimeConfig();
  Amplify.configure(constructAmplifyConfig(config));

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <App runtimeConfig={config} />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Portal bootstrap failed:', e);
  const el = document.getElementById('root');
  if (el) el.innerText = 'Failed to start portal. Check runtimeConfig.json and console.';
});


