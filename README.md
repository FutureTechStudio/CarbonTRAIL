# CarbonTrail AI

**Challenge:** Carbon Footprint Awareness Platform

CarbonTrail AI is a responsive web app that helps individuals understand, track, and reduce their day-to-day carbon footprint through lightweight check-ins, profile memory, and visual storytelling.

## Problem
Carbon footprint is invisible in daily life. People do not easily understand how commute, meals, home energy, deliveries, shopping, and waste contribute to emissions.

## Solution
CarbonTrail AI uses **Panda AI**, an environmentally aware assistant that learns user routines through small daily check-ins and natural conversation. Users can respond with quick chips, type casual updates, or chat with the floating Panda assistant. The app converts activities into estimated carbon impact and visualizes the day as a **Daily Living Trail**.

## Core features
- Guest mode (local-first)
- Quick baseline setup
- My Carbon Memory profile
- Panda AI check-ins + floating chat
- Free-text activity parser (local + optional Gemini)
- Routine-based auto-fill
- Confidence labels
- Today Carbon Trail with user avatar checkpoint
- Weekly Forest
- LeafPoints for data quality
- Green Impact for estimated CO₂ savings
- Scenario Simulator

## Panda AI assistant
Panda AI is calm, friendly, and non-judgmental. It helps users log daily activities, understand footprint impact, and complete their Daily Living Trail.

Example prompts:
- “I'm leaving for office now.”
- “I went to office at 8AM in a bus.”
- “I ordered chicken biryani for dinner.”
- “Used AC for 4 hours at night.”

Panda uses **Carbon Memory** when details are missing and marks assumed/predicted data visually distinct from confirmed entries.

## LeafPoints vs Green Impact
**LeafPoints** reward data quality and consistency (sharing commute, meals, energy details, corrections, completed trail). They do **not** reward low-carbon claims directly.

**Green Impact** separately estimates CO₂ saved compared to the user's usual routine.

## Optional Gemini integration
Panda AI works fully **without** an API key using the local rule-based parser.

To enable Gemini or Mistral for richer parsing (demo/local only):

1. Copy `.env.example` to `.env.local`
2. Set **Gemini**:
   ```bash
   VITE_AI_MODE=gemini
   VITE_GEMINI_API_KEY=your_key_here
   VITE_GEMINI_MODEL=gemini-2.0-flash
   ```
   Or **Mistral**:
   ```bash
   VITE_AI_MODE=mistral
   VITE_MISTRAL_API_KEY=your_key_here
   VITE_MISTRAL_MODEL=mistral-small-latest
   ```

**Security warning:** Direct frontend API keys are visible in the browser bundle. Use them only for local/demo development. For production, use a backend or serverless proxy:

```bash
VITE_AI_PROXY_URL=/api/panda/parse
GEMINI_API_KEY=your_key_here   # server-side only
MISTRAL_API_KEY=your_key_here  # server-side only
```

Never commit `.env`, `.env.local`, or real API keys.

### How parsing works
`parsePandaMessage(message, context)` in `src/ai/pandaAiService.ts`:
1. Tries Gemini or Mistral when enabled and configured
2. Validates JSON output
3. Falls back to `src/ai/pandaLocalParser.ts` on missing key, errors, or invalid JSON

Gemini returns structured JSON only — it does **not** mutate app state directly.

### Privacy
Only safe context is sent to Gemini when enabled:
- current date/time, day of week
- Carbon Memory summary (living area type, usual commute, work mode)
- today's logged activity labels and checkpoint statuses

No exact address, secrets, or unnecessary personal data is sent.

## Tech stack
- React + Vite + TypeScript
- Tailwind CSS
- localStorage guest state
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

Includes Panda AI local parser, fallback, LeafPoints, and behavior probability tests.

## Assumptions
Carbon estimates are approximate and intended for personal awareness, not certified carbon accounting. The MVP uses simplified demo emission factors and local rule-based parsing with optional Gemini enhancement.

## Future scope
- Production Gemini proxy endpoint
- India-specific factor pack
- account import/export
- richer behavior pattern storage
- social/group missions
