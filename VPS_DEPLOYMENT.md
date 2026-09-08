# Findam VPS deployment

Production uses AlmaLinux, PostgreSQL, systemd, and Nginx. Node services run directly; ports 3000 and 3001 stay private.

## Services

| Service | Bind | Public URL |
| --- | --- | --- |
| API (`apps/api`) | `127.0.0.1:3000` | `https://api.grastadomham.com/api/v1` |
| Media (`apps/media`) | `127.0.0.1:3001` | `https://api.grastadomham.com/media` |
| Console | Nginx static files | `https://admin.grastadomham.com` |
| Web | Nginx static files | `https://grastadomham.com` |

## Environment files

```bash
cd /var/www/findam
cp apps/api/.env.production.example apps/api/.env.production
cp apps/media/.env.production.example apps/media/.env.production
cp apps/api-console/.env.production.example apps/api-console/.env.production
cp apps/web/.env.production.example apps/web/.env.production
chmod 600 apps/api/.env.production apps/media/.env.production
```

API requires `NODE_ENV`, `PORT`, `API_PREFIX`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `CORS_ORIGIN`, `STORAGE_PROVIDER`, `MEDIA_SERVICE_URL`, `MEDIA_PUBLIC_URL`, `MEDIA_PROJECT_SLUG`, and `MEDIA_API_KEY`. Optional variables are Google OAuth, Geoapify, `MEDIA_FOLDER_PATH`, and throttle settings.

Use `STORAGE_PROVIDER=self-hosted`, `MEDIA_SERVICE_URL=http://127.0.0.1:3001`, and `MEDIA_PUBLIC_URL=https://api.grastadomham.com`.

The media service requires `NODE_ENV`, `MEDIA_PORT`, `API_PREFIX`, `CORS_ORIGIN`, `MEDIA_DATABASE_URL`, `MEDIA_STORAGE_PATH`, and `JWT_ACCESS_SECRET`. Its JWT access secret must be byte-for-byte identical to the API's `JWT_ACCESS_SECRET`. It does not use the refresh secret.

The console and web builds use relative URLs behind Nginx. Leave `VITE_API_URL` empty in the console production env. Configure the real Play Store and App Store URLs in the web production env.

## Media session error

The media admin guard verifies the `findam_admin_access` cookie with `process.env.JWT_ACCESS_SECRET`. If media starts without its app environment loaded, verification fails and the guard returns the generic `Administrator session is invalid or expired`. Media now validates `JWT_ACCESS_SECRET` and `MEDIA_DATABASE_URL` at startup. Run it with `WorkingDirectory=/var/www/findam/apps/media` or use its production env explicitly. The expected secret name is the same on both services: `JWT_ACCESS_SECRET`.

## Install, migrate, and build

```bash
cd /var/www/findam
npm ci --prefix apps/api
npm ci --prefix apps/media
npm ci --prefix apps/api-console
npm ci --prefix apps/web
cd apps/api
npx prisma generate && npx prisma migrate deploy && npm run build
cd ../media
npx prisma generate && npx prisma migrate deploy && npm run build
cd ../api-console && npm run build
cd ../web && npm run build
```

Nest entry points are `apps/api/dist/src/main.js` and `apps/media/dist/main.js`.

## Media project and production key

The production media database needs an active project with slug `findam`. The development database is not shared automatically. After migrating a new media database, log into the console, open Media, create the `findam` project if absent, and create a production API key. Put the one-time returned key in API `.env.production` as `MEDIA_API_KEY`; only its hash is stored. Restart the API after changing it.

## systemd

```bash
sudo useradd --system --home /var/www/findam --shell /sbin/nologin findam
sudo mkdir -p /var/lib/findam/media
sudo chown -R findam:findam /var/www/findam /var/lib/findam/media
```

`/etc/systemd/system/findam-api.service` (adjust the path only if you install elsewhere):

```ini
[Unit]
After=network-online.target postgresql.service
Wants=network-online.target
[Service]
Type=simple
User=findam
WorkingDirectory=/var/www/findam/apps/api
EnvironmentFile=/var/www/findam/apps/api/.env.production
ExecStart=/usr/bin/node /var/www/findam/apps/api/dist/src/main.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
[Install]
WantedBy=multi-user.target
```

Create `findam-media.service` with the same sections, changing `WorkingDirectory`, `EnvironmentFile`, and `ExecStart` to `/var/www/findam/apps/media` and `/var/www/findam/apps/media/dist/main.js`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now findam-api findam-media
sudo systemctl restart findam-api findam-media
sudo journalctl -u findam-api -u findam-media -f
```

## Nginx

Serve `apps/api-console/dist` on the admin host and `apps/web/dist` on the public host. On the admin host, route media before the general API route:

```nginx
location / { try_files $uri /index.html; }
location ^~ /api/v1/admin/media {
    rewrite ^/api/v1/admin/media/?(.*)$ /api/v1/admin/$1 break;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
}
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location /media/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Install HTTPS certificates, redirect HTTP to HTTPS, and ensure DNS points all three domains to the VPS. The SSE dashboard route requires `proxy_buffering off` and a long read timeout if proxied separately.

## Health and upload verification

```bash
curl -fsS https://api.grastadomham.com/api/v1/health
curl -fsS http://127.0.0.1:3001/api/v1/health
curl -I https://admin.grastadomham.com
curl -I https://grastadomham.com
```

Log into the console, upload a small image in the `findam` project, confirm its URL starts with `https://api.grastadomham.com/media/`, open that URL privately, and test one mobile/API upload with the production project key.

## Subsequent deployments

```bash
cd /var/www/findam
git pull --ff-only origin main
npm ci --prefix apps/api && npm ci --prefix apps/media
npm ci --prefix apps/api-console && npm ci --prefix apps/web
cd apps/api
npx prisma generate && npx prisma migrate deploy && npm run build
cd ../media
npx prisma generate && npx prisma migrate deploy && npm run build
cd ../api-console && npm run build
cd ../web && npm run build
sudo systemctl restart findam-api findam-media
sudo nginx -t && sudo systemctl reload nginx
```

Never commit production env files, passwords, JWT secrets, media keys, or database credentials.
