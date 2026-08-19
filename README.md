# RosoTravel Mapbox Homepage

Standalone Next.js prototype of the Destination Discovery Map using Mapbox GL JS.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add a public Mapbox token restricted to your local and production origins.
3. Run `npm install`.
4. Run `npm run dev`.

The recommendation list remains usable if the token is missing or the map fails.

## Commands

- `npm run dev` — local development
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run start` — serve the production build

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for scope and requirement coverage.
