# Projector Pro API

This is the dedicated API boundary for Projector Pro. The first migration step
is a compatibility gateway: it forwards only Projector Pro authentication and
product routes to the existing API while the Projector Pro data is migrated.

It deliberately does not proxy general Findam routes. Once the independent
Projector Pro database is ready, the gateway handlers can be replaced without
changing the desktop client's base URL again.

Endpoints:

- `GET /health`
- `GET /api/v1/docs`
- `GET /api/v1/docs-json`
- `/api/v1/auth/*` for Projector Pro sign-in flows
- `/api/v1/projectorpro/*` for credits, Deepgram, and Paystack flows
