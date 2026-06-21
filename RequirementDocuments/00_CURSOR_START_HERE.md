# CarbonTrail AI — Cursor Start Here

## Challenge
[Challenge 3] Carbon Footprint Awareness Platform: design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Product direction
Build CarbonTrail AI as a responsive web app with:
- Guest mode and local-first storage.
- Sprout AI check-ins with quick chips + free text.
- A living editable profile called My Carbon Memory.
- Routine-based auto-fill for skipped days.
- Confidence labels for confirmed / assumed / estimated data.
- LeafPoints for data quality and consistency.
- Green Impact separately for estimated CO2 savings.
- Visual storytelling with trails, trees, smoke, house haze, parcels, forests, and valleys instead of standard graphs.

## Non-negotiables
1. Start small but detailed.
2. App must run without signup, backend, or API key.
3. Do not redesign from scratch; keep current CarbonTrail AI theme.
4. Ask once, remember later.
5. Do not reward users for claiming low-carbon actions; reward useful detail shared.
6. Use localStorage for guest persistence.
7. Keep repo under the challenge size limit. Do not commit node_modules, dist, big images, videos, or secrets.
8. Mobile and laptop layouts must both be stable.

## Recommended stack
React + Vite + TypeScript + Tailwind CSS + React Router + localStorage + Vitest.

## Build order
1. App shell and responsive navigation.
2. Types and demo data.
3. Guest storage.
4. Baseline setup.
5. My Carbon Memory profile.
6. Carbon estimation engine.
7. Today Dashboard.
8. Sprout AI Check-in.
9. Free-text parser fallback.
10. Routine auto-fill.
11. Confidence scoring.
12. LeafPoints + Green Impact.
13. Weekly Forest.
14. Basic Scenario Simulator.
15. README, tests, accessibility and final polish.

## First instruction for Cursor
Read all files in this folder before modifying code. Then inspect the current project and propose a short implementation plan. Do not redesign the app from scratch.
