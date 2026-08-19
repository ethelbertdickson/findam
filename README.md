# Findam

A mobile marketplace for property rentals, land, and used household items.

- **Mobile**: Expo (React Native) + TypeScript + Expo Router, TanStack Query, Zustand
- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL/PostGIS
- **Images**: Cloudinary (behind a swappable storage abstraction)

The mobile app talks **only** to the NestJS REST API (`/api/v1`) over HTTPS. It never
connects to PostgreSQL directly.

```
apps/
├── mobile/   Expo Router app (guest browsing, auth, listings, agents, settings)
└── api/      NestJS REST API (auth, listings, agents, locations, uploads, ...)
```

## Status: Core marketplace implementation

The core guest browsing, authentication, listings, favorites, agent profiles,
ratings, location search, uploads, and mobile management flows are implemented.

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL + PostGIS)
- Expo Go app or an Android/iOS simulator (for the mobile app)

## Quick start

### 1. Start PostgreSQL (PostGIS-enabled)

```bash
docker compose up -d postgres
```

This runs `postgis/postgis:16-3.4` and persists data in a named Docker volume.

### 2. Backend (NestJS)

```bash
cd apps/api
cp .env.example .env      # adjust secrets/DB URL as needed
npm install
npx prisma migrate dev    # applies migrations, generates the Prisma client
npm run start:dev

# Optional: load a working demo catalog
npm run db:seed
```

- API base URL: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/v1/docs`
- Health check: `GET /api/v1/health`

### 3. Mobile app (Expo)

```bash
cd apps/mobile
cp .env.example .env
npm install
npm run start              # scan the QR code with Expo Go, or press a/i for a simulator
```

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to point at your backend
(use your machine's LAN IP instead of `localhost` when testing on a physical device).

### Google sign-in setup

Google sign-in uses a native component, so test it with an Expo development build
rather than Expo Go. Create OAuth clients in Google Cloud for the Android package
`com.findam.app` (and the iOS bundle identifier with the same value), plus a Web
client ID for backend token verification. Then set:

```bash
# apps/mobile/.env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# apps/api/.env (comma-separated when accepting more than one client ID)
GOOGLE_CLIENT_IDS=your-web-client-id.apps.googleusercontent.com
```

After changing either environment file, restart the corresponding development
server. The API verifies Google ID tokens before creating or linking an account.

## How Prisma migrations work

- The schema lives in [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma).
- `npx prisma migrate dev --name <description>` creates a new SQL migration file
  under `apps/api/prisma/migrations/` and applies it to your local database.
- `npx prisma migrate deploy` applies pending migrations in production/CI — this
  is the command a deployment pipeline should run. **Do not use `prisma db push`
  for anything beyond quick local prototyping**; it does not produce migration
  history.
- `npx prisma generate` regenerates the type-safe Prisma Client after schema
  changes (run automatically by `migrate dev`).
- PostGIS support is enabled via the `postgresqlExtensions` preview feature and
  `extensions = [postgis]` in the datasource block, so `CREATE EXTENSION postgis`
  is managed by Prisma migrations automatically.

## Architectural decisions

- **Monorepo, independent installs.** `apps/mobile` and `apps/api` each manage
  their own `package.json`/lockfile rather than a single npm/pnpm workspace,
  to avoid coupling native mobile tooling with server dependency resolution.
- **One `Listing` parent model** (`type: PROPERTY | LAND | HOUSEHOLD`) with
  specialized 1:1 detail tables (`PropertyDetails`, `LandDetails`,
  `HouseholdItemDetails`) instead of three independent listing systems, so
  search/browse/favorites/images work uniformly across all listing types.
- **One `User` account system.** An `AgentProfile` (1:1 with `User`) is what
  grants listing-management capability, rather than a separate agent auth
  system. `Role` (`USER`/`AGENT`/`ADMIN`) exists for coarse authorization, but
  agent capability is primarily driven by the presence of an `AgentProfile`.
- **Rental charges stored individually** (`securityDeposit`, `agencyFee`,
  `legalFee`, `cautionFee`, `serviceCharge`, `otherCharges` on
  `PropertyDetails`). The "Total Move-In Cost" is always calculated from these
  fields, never stored, so it can't drift from its inputs.
- **PostGIS for radius search.** `Listing.location` is an
  `Unsupported("geography(Point, 4326)")` column kept in sync with
  `latitude`/`longitude`. Nearby/radius queries will run as raw SQL
  (`ST_DWithin`) in the backend — the mobile app never downloads the full
  listings table to compute distance on-device.
- **Storage abstraction for images.** The `uploads` module is intended to
  expose a generic `StorageProvider` interface with a `CloudinaryProvider`
  implementation, so the listings module never depends on Cloudinary directly
  and the provider can be swapped for S3 later.
- **Guest-first mobile UX.** Screens under `app/(tabs)` render without
  authentication; the `useAuth` hook + `auth-store` gate write actions
  (favorite, rate, create/edit listing, profile) and redirect to
  `/auth/login` when there's no session.
- **Secrets stay server-side.** The mobile app only ever holds short-lived
  JWTs (via Expo Secure Store) and a public API base URL; Cloudinary/DB/JWT
  secrets live only in `apps/api/.env`.

## Development Approach (phased roadmap)

| Phase         | Scope                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| 1–2 | Expo + NestJS foundation, Prisma/PostGIS, auth, JWT access + refresh tokens |
| 3 | Common listing CRUD, specialized details, ownership checks |
| 4 | Cloudinary upload abstraction, multi-image submission, client image quality controls |
| 5 | Home feeds, filters, search, location hierarchy, PostGIS radius queries |
| 6 | Agent profiles, agent listings, ratings/reviews with duplicate protection |
| 7 | Favorites, saved listings, profile/settings, create/manage listing screens |
| 8 | Pagination, loading/empty/error states, throttling, Helmet, validation, demo seed, build verification |

Each backend feature module under `apps/api/src/` currently contains a
`README.md` describing what belongs there and in which phase it will be built.

## Environment variables

See [apps/api/.env.example](apps/api/.env.example) and
[apps/mobile/.env.example](apps/mobile/.env.example). Never commit real
secrets — `.env` files are gitignored.
