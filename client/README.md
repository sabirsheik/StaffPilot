# StaffPilot Client

The client is the StaffPilot browser application. It provides role-aware dashboards and workflows for administrators, team leads, and interns.

## Responsibilities

- Authenticate users and protect routes by role
- Render dashboards for `super_admin`, `team_lead`, and `intern`
- Provide attendance, projects, tasks, notifications, users, teams, and settings workflows
- Coordinate server state with TanStack Query
- Centralize HTTP behavior, authorization headers, and session expiry handling
- Provide responsive layouts and reusable UI primitives

## Stack

- React 19 and TypeScript
- Vite with the React plugin
- React Router DOM
- TanStack Query
- Axios with `withCredentials` enabled
- Tailwind CSS and PostCSS
- Lucide React and React Hot Toast

## Source Layout

```text
client/
├── public/              # Static assets, including Logo.png
├── src/
│   ├── api/              # API endpoint clients
│   ├── assets/           # Bundled assets
│   ├── components/       # Layout and reusable UI components
│   ├── constants/        # Roles and storage keys
│   ├── context/          # Authentication context
│   ├── hooks/            # API and project hooks
│   ├── layouts/          # Authenticated and auth layouts
│   ├── lib/              # Axios and navigation utilities
│   ├── pages/             # Route-level screens
│   ├── routes/            # Protected route boundaries
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── postcss.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Prerequisites

- Node.js 18 or newer
- npm
- The StaffPilot API running on port `5000` for local development

## Installation and Development

```bash
cd client
npm install
npm run dev
```

The application is available at <http://localhost:5173>. Vite proxies `/api` and `/uploads` to `http://localhost:5000`, as configured in [vite.config.ts](vite.config.ts).

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | Run Oxlint |
| `npm run typecheck` | Run TypeScript without emitting files |

## Application Areas

| Role | Screens and workflows |
| --- | --- |
| Super Admin | Dashboard, users, teams, attendance, settings |
| Team Lead | Dashboard, interns, attendance, projects, tasks |
| Intern | Dashboard, attendance, assigned projects and tasks |
| Shared | Login, registration, notifications, account/session handling |

## API Integration

API calls are defined in [src/api/endpoints.ts](src/api/endpoints.ts) and use the Axios instance in [src/lib/axios.ts](src/lib/axios.ts). The base URL is `/api`, so the browser uses the same origin in development and production. The Axios layer:

- Sends the JWT as a Bearer token when one is available
- Sends credentials for cookie-based flows
- Normalizes network and API errors
- Redirects unauthenticated users to `/login` while preserving the requested path

### Frontend environment

Copy `.env.example` to `.env.local` for local overrides. Vite exposes only variables prefixed with `VITE_` to browser code.

```env
VITE_API_BASE_URL=/api
```

Use `/api` when the frontend host forwards `/api` and `/uploads` to the server. If the API is deployed separately, set the public API path instead, for example:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

The value is compiled into the client during `npm run build`, so update the hosting provider's frontend environment variable and rebuild/redeploy after changing it. API requests then go to `${VITE_API_BASE_URL}/auth/...`, `${VITE_API_BASE_URL}/projects/...`, and so on. Uploaded files use the same backend origin.

The API contract and server configuration are documented in [../server/README.md](../server/README.md).

## Production Delivery

```bash
npm run build
npm run preview
```

For deployment, publish the generated `dist/` directory through a static host or web server and enable SPA fallback to `index.html`. Either forward `/api` and `/uploads` to the StaffPilot API, or set `VITE_API_BASE_URL` to the separately deployed API before building. The server's `CLIENT_URL` must equal the deployed frontend origin.

## Verification

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Keep environment-specific API routing in the hosting/proxy layer rather than hard-coding production URLs in the client.


