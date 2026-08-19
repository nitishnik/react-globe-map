# Mapbox Homepage — Implementation Plan

## Goal

Build a standalone Next.js implementation of the Destination Discovery Map using Mapbox GL JS and the existing sample recommendation catalog.

The build targets the client brief as closely as the available data permits. Required Mapbox logo and attribution remain visible. Live inventory, photography, reviews, availability, and booking integrations are represented by explicit prototype content because those services are not available in this repository.

## Architecture

- Next.js App Router, TypeScript, Tailwind CSS
- Server-rendered homepage and crawlable destination routes
- Client-side L0–L3 recommendation funnel
- One Mapbox GL map instance for Natural Earth, Mercator, and globe projections
- Own Natural Earth country geometry and RosoTravel visual treatment
- Existing sample catalog, ranking rules, match tiers, trade-offs, and product differentiation

## Requirement mapping

| Requirement | Implementation |
| --- | --- |
| L0 world | Natural Earth projection, own country polygons, ranked country pills |
| L1 country | Mercator projection, selected-country fill, cities and attraction counts |
| L2 city | Quiet dotted field, centre, kilometre rings, true attraction coordinates |
| L3 attraction | City-scale context, selected attraction and tappable siblings |
| Preference input | Seven audience chips, local re-ranking, poor-fit-only reset to L0 |
| Navigation | Pin/list descent, breadcrumb and zoom ascent, pan never changes level |
| Readability | Screen-space collision layout, progressive badge/label reduction |
| Enhancement | Server-rendered recommendation content survives missing/failed map |
| Phase 2 globe | Same map instance and styling with globe projection and tilt |
| Branding | Mapbox logo and attribution remain visible as required by Mapbox terms |

## Build sequence

1. Scaffold the standalone Next.js app and environment contract.
2. Port catalog, types, ranking, geometry, and funnel state.
3. Port recommendation UI and design tokens.
4. Implement the Mapbox surface, layers, camera, pins, and globe.
5. Add server-rendered homepage content and crawlable detail routes.
6. Add poster, loading, missing-token, and map-error states.
7. Verify lint, production build, responsive behavior, and brief checklist.

## Verification checklist

- [ ] L0 uses Natural Earth and frames all destinations. Implemented; live-token browser check pending.
- [ ] L1 switches to Mercator and fits the selected country. Implemented; live-token browser check pending.
- [ ] L2 is a quiet dotted field with centre, rings, scale, and real coordinates. Implemented; live-token browser check pending.
- [ ] L3 remains at city scale with selected and sibling attractions. Implemented; live-token browser check pending.
- [ ] Globe keeps the same visual language and does not remount the map. Implemented; live-token browser check pending.
- [x] Preference changes re-rank; only poor fits return to L0.
- [x] Pin and list navigation stay synchronized.
- [ ] Zoom changes business level; pan does not. Implemented; live-token browser check pending.
- [x] Labels and layout remain readable at 390px in fallback/list mode.
- [x] Default recommendation content is server rendered and crawlable.
- [x] Missing token or map failure leaves recommendations usable.
- [ ] Mapbox attribution remains visible and unobscured. Implemented; live-token browser check pending.
- [x] Lint and production build pass.

## Residual production dependencies

- Live catalog and CMS
- Real destination and product photography
- Preference-filtered review service
- Live prices and availability
- Booking destination URLs and checkout handoff

## Status

Implementation complete.

Verified on 19 August 2026:

- ESLint passes.
- Next.js production build passes.
- 74 pages are prerendered (homepage plus country, city, and attraction routes).
- Browser checks pass for the missing-token fallback, L0–L3 list navigation, direct routes, the unified “How We Do It” section, and 390px responsive layout.
- Live Mapbox rendering remains the only verification dependency; add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` and run the unchecked map-surface checks above.
