# Findam API Console

Local operations dashboard for the Findam NestJS API.

The console uses an administrator-only browser session backed by the NestJS API.
Access and refresh tokens remain in HTTP-only cookies, while state-changing
session requests require a matching CSRF token. The overview reads live API
uptime, database health, marketplace totals, seven-day growth, and recent
activity from the protected `GET /api/v1/admin/dashboard` endpoint.
The Users and Listings workspaces use protected, paginated admin endpoints and
support server-side search and filtering without exposing credential fields.
Account activation/deactivation and listing approval, rejection, and archiving
require a confirmation step, CSRF protection, and are recorded in the Audit log.
API monitoring shows live five-minute request, latency, route, and error data
from the running NestJS process. The Tasks workspace can run and retain a
database health-check result, forming the local foundation for future workers.

## Local development

```bash
npm install
npm run dev
```

The console runs at `http://localhost:5173` by default and proxies `/api`
requests to the Findam API at `http://localhost:3000`. Start the API before
signing in.

## Create the first administrator

The command refuses to promote an existing user and never prints the password.
Run it after PostgreSQL and the API environment have been configured:

```bash
cd apps/api
read -r -p "Admin email: " FINDAM_ADMIN_EMAIL
read -r -s -p "Admin password (12+ characters): " FINDAM_ADMIN_PASSWORD
printf '\n'
export FINDAM_ADMIN_EMAIL FINDAM_ADMIN_PASSWORD
npm run admin:create
unset FINDAM_ADMIN_EMAIL FINDAM_ADMIN_PASSWORD
```

The administrator can then sign in through the console. Normal `USER` and
`AGENT` accounts are rejected.

## Build

```bash
npm run build
```

The production-ready static files are written to `dist/` and can later be
served by Caddy or Nginx on the VPS.
