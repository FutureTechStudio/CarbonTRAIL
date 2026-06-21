# Cursor Build Prompts

Use one prompt at a time.

## Prompt 1 — inspect project
```text
Read all files in carbontrail_build_docs. Then inspect the current project. Do not modify code yet. Summarize current structure, what already exists, and a step-by-step implementation plan.
```

## Prompt 2 — types and demo data
```text
Create TypeScript types for UserProfile, LearnedPattern, ActivityDay, ActivityEntry, ParsedResult, LeafPointEvent, and supporting enums based on carbontrail_build_docs. Add demo guest profile and one sample day. Do not change UI yet.
```

## Prompt 3 — guest storage
```text
Implement local-first guest storage with localStorage. Add loadState, saveState, resetState, createGuestProfile, and migration support. Guest data must persist after refresh.
```

## Prompt 4 — carbon engine
```text
Implement the simplified carbon estimation engine from carbontrail_build_docs/04_CARBON_ENGINE.md. Add generic_demo factor pack and pure functions for transport, food, energy, waste, activity and day totals. Add tests.
```

## Prompt 5 — parser fallback
```text
Implement local free-text parser from carbontrail_build_docs/05_CHECKIN_AND_PARSER.md. Detect travel, work mode, meal source, food type, energy, shopping/delivery, waste, distance and hours. Return ParsedResult and at most one follow-up.
```

## Prompt 6 — check-in engine
```text
Implement check-in engine that uses saved profile details and avoids repeated questions. If profile has scooter and 14 km commute, ask: "Did you commute on your scooter like usual today?" with Yes, No, I worked from home, Different travel chips and free text enabled.
```

## Prompt 7 — profile memory
```text
Implement profile memory: calculate profile confidence, suggest profile updates from parsed results, confirm learned patterns, and edit profile fields.
```

## Prompt 8 — routine auto-fill
```text
Implement routine-based auto-fill. Generate weekday office, weekday WFH and weekend templates. Mark auto-filled activities as estimated_from_profile and show lower confidence.
```

## Prompt 9 — LeafPoints and Green Impact
```text
Implement LeafPoints and Green Impact. LeafPoints must reward data quality and consistency only. Do not reward low-carbon claims directly. Green Impact must separately calculate baselineCo2e - actualCo2e.
```

## Prompt 10 — navigation
```text
Update responsive navigation. Mobile bottom nav: Today, Check-in, Forest, Simulate, Profile. Desktop sidebar: Today, Check-in, Weekly Forest, Monthly Valley, Simulator, Profile.
```

## Prompt 11 — Today page
```text
Update Today Dashboard with Created Today, Saved Today, Net Change, Impact Score, Confidence, Today Trail, LeafPoints, Green Impact, and activity timeline. Confirmed nodes solid, assumed amber, estimated faded/dotted.
```

## Prompt 12 — Check-in page
```text
Build Sprout AI Check-in screen with saved profile context card, quick chips, free text input, parsed preview, clarification, Save only for today and Remember this pattern actions.
```

## Prompt 13 — Profile page
```text
Build Profile page as My Carbon Memory with editable core profile, commute, food, energy, shopping/waste, learned patterns, default emissions, and confidence.
```

## Prompt 14 — Weekly Forest
```text
Build Weekly Forest screen with seven trees and weekly summary. Avoid graph-like visuals.
```

## Prompt 15 — Scenario Simulator
```text
Build simple Scenario Simulator with before/after landscape and controls for AC, short trip, delivery, and home-cooked dinner.
```

## Prompt 16 — final polish
```text
Improve accessibility, responsiveness, tests, README, and build stability. Run lint, tests and build. Fix all errors.
```
