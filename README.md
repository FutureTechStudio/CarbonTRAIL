# CarbonTrail AI

**Challenge:** Carbon Footprint Awareness Platform

CarbonTrail AI is a responsive web app that helps individuals understand, track, and reduce their day-to-day carbon footprint through lightweight logging, profile memory, and visual storytelling.

## Problem
Carbon footprint is invisible in daily life. People do not easily understand how commute, meals, home energy, deliveries, shopping, and waste contribute to emissions.

## Solution
CarbonTrail AI uses **Panda AI**, an environmentally aware assistant that learns user routines through natural conversation. Users describe their day in plain language; the app converts activities into estimated carbon impact and visualizes the day as a **Daily Living Trail**.

## Core features
- **Guest mode** (local-first, no signup required)
- **Baseline setup** and editable **Carbon Memory** profile
- **Today** dashboard with circular daily journey, event impact chart, and activity timeline
- **Panda AI** chat composer for natural-language logging
- **Free-text parser** (local rule-based, with optional Mistral/Gemini via server-side proxy)
- **Carbon History** with week, month, and year views, category breakdown, and Panda insights
- **Leaf Points** and profile confidence for data quality
- **Routine-based auto-fill** with confidence labels for estimated vs. confirmed data
- **Green Impact** estimates compared with the user's usual pattern

## Panda AI assistant
Panda AI is calm, friendly, and non-judgmental. It helps users log daily activities, understand footprint impact, and complete their Daily Living Trail.

Example prompts:
- “I'm leaving for office now.”
- “I took a bus to office, had lunch at the canteen, and used AC for 3 hours.”
- “I ordered chicken biryani for dinner.”
- “Used AC for 4 hours at night.”

Panda uses **Carbon Memory** when details are missing and marks assumed/predicted data visually distinct from confirmed entries.

## LeafPoints vs Green Impact
**LeafPoints** reward data quality and consistency (sharing commute, meals, energy details, corrections, completed trail). They do **not** reward low-carbon claims directly.

**Green Impact** separately estimates CO₂ saved compared to the user's usual routine.

## Optional Gemini / Mistral integration
Panda AI works fully **without** an API key using the local rule-based parser.

To enable cloud parsing, keep API keys **server-side only**. The browser calls `/api/panda/parse`; the Vite dev server (or your production backend) holds the key.

1. Copy `.env.example` to `.env.local`
2. **Mistral (local dev):**
   ```bash
   VITE_AI_MODE=mistral
   VITE_MISTRAL_MODEL=mistral-small-latest
   MISTRAL_API_KEY=your_key_here
   ```
   Or **Gemini (local dev):**
   ```bash
   VITE_AI_MODE=gemini
   VITE_GEMINI_MODEL=gemini-2.0-flash
   GEMINI_API_KEY=your_key_here
   ```
3. Run `npm run dev` — requests go through the built-in Vite proxy (keys never enter the browser bundle).

**Production:** deploy a backend or serverless function at `/api/panda/parse` and set:
```bash
VITE_AI_PROXY_URL=/api/panda/parse
MISTRAL_API_KEY=your_key_here   # server environment only
# or GEMINI_API_KEY=your_key_here
```

Never commit `.env`, `.env.local`, `.env.production`, or real API keys. Do **not** use `VITE_GEMINI_API_KEY` or `VITE_MISTRAL_API_KEY` — those expose keys in the client bundle.

### How parsing works
`parsePandaMessage(message, context)` in `src/ai/pandaAiService.ts`:
1. Tries Mistral or Gemini through the proxy when enabled and configured
2. Validates JSON output
3. Falls back to `src/ai/pandaLocalParser.ts` on missing proxy, errors, or invalid JSON

Cloud models return structured JSON only — they do **not** mutate app state directly.

### Privacy
Only safe context is sent when cloud parsing is enabled:
- current date/time, day of week
- Carbon Memory summary (living area type, usual commute, work mode)
- today's logged activity labels and checkpoint statuses

No exact address, secrets, or unnecessary personal data is sent.

## Tech stack
- React + Vite + TypeScript
- Tailwind CSS
- localStorage guest state
- Vitest + ESLint

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

## Test & lint
```bash
npm run test
npm run lint
```

Includes Panda AI local parser, fallback, LeafPoints, history aggregation, and behavior probability tests.

## Assumptions
Carbon estimates are approximate and intended for personal awareness, not certified carbon accounting. The MVP uses simplified demo emission factors and local rule-based parsing with optional Mistral/Gemini enhancement via a server-side proxy.

## Limitations
- Emission factors are demo-grade, not region-certified
- Cloud AI requires a proxy in production; the live app can run fully on the local parser
- Guest data is stored in the browser only until account sync is added

## Future scope
- Production serverless proxy deploy for all hosting environments
- India-specific factor pack
- Account import/export and authenticated profiles
- Richer behavior pattern storage
- Social/group climate missions
