## AiAgentsWorkforce Customer Portal (MVP)

This is the **customer-facing portal** UI (separate from the admin console in `../ui-deployment`).

### Tech
- React + TypeScript + Vite
- Tailwind CSS (light/dark/system theme)
- AWS Amplify (Cognito auth + API)

### Local dev
1) Install deps:
```bash
cd source/ui-portal
npm install
```

2) Create `public/runtimeConfig.json` (or copy from `public/runtimeConfig.example.json`):
```bash
cp public/runtimeConfig.example.json public/runtimeConfig.json
```

3) Start:
```bash
npm run dev
```

### Notes
- The portal uses the **same Cognito User Pool** and **same REST API** as the platform, but shows only tenant-scoped data.
- The portal URL target is `portal.aiagentsworkforce.com`.


