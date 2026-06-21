# CarbonTrail AI

**Challenge:** Carbon Footprint Awareness Platform

CarbonTrail AI is a responsive web app that helps individuals understand, track, and reduce their day-to-day carbon footprint through lightweight check-ins, profile memory, and visual storytelling.

## Problem
Carbon footprint is invisible in daily life. People do not easily understand how commute, meals, home energy, deliveries, shopping, and waste contribute to emissions.

## Solution
CarbonTrail AI uses Sprout AI, a smart assistant that learns user routines through small daily check-ins. Users can respond with quick chips or type natural-language updates. The app converts activities into estimated carbon impact and visualizes the day as a carbon trail.

## Core features
- Guest mode
- Quick baseline setup
- My Carbon Memory profile
- Sprout AI check-ins
- Free-text activity parser
- Routine-based auto-fill
- Confidence labels
- Today Carbon Trail
- Weekly Forest
- LeafPoints for data quality
- Green Impact for estimated CO2 savings
- Scenario Simulator

## Smart assistant logic
The app asks once and remembers later. If the user has already saved a usual scooter commute of 14 km, the app asks:

> Did you commute on your scooter like usual today?

It does not ask the same distance question every day.

## LeafPoints vs Green Impact
LeafPoints reward data quality and consistency, not low-carbon claims.

Green Impact separately estimates CO2 saved compared to the user's usual routine.

## Tech stack
- React
- Vite
- TypeScript
- Tailwind CSS
- localStorage
- Vitest

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Test
```bash
npm run test
```

## Assumptions
Carbon estimates are approximate and intended for personal awareness, not certified carbon accounting. The MVP uses simplified demo emission factors and local rule-based parsing.

## Privacy
The MVP is local-first. Guest data stays in browser storage. No bank data, GPS data, exact address, or API key is required.

## Future scope
- Gemini API parser
- India-specific factor pack
- account import/export
- real device sync
- richer monthly valley
- social/group missions
