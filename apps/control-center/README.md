# Grasta Domhan Control Centre service

This package is deliberately independent from Findam, MarketList, and Projector Pro.
It has no product database connection. It reads only the versioned product integration
contract over HTTPS and returns an aggregated operational snapshot.

## Contract

- `GET /health` — process health
- `GET /api/v1/control/products` — product health, users, storage, usage, and alerts

Set `CONTROL_CENTRE_TOKEN` to require `x-control-token` on the product snapshot route.
Product integration keys stay in this server's environment only.

This is the backend boundary for `control.grastadomhan.com`; authentication, rate
limits, audit logging, and deployment should be added before exposing it publicly.
