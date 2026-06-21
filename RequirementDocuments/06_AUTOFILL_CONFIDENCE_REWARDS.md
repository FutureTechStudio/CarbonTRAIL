# Auto-fill, Confidence, LeafPoints and Green Impact

## Routine auto-fill

If user skips a day, generate estimated activities from profile.

Banner:
```text
Today was auto-filled from your usual routine.
Confidence: 58%
```

Buttons:
- Confirm day
- Edit activities

## Auto-fill rules
Choose template:
1. weekend → weekend_home
2. learned WFH day → weekday_wfh
3. usual office/hybrid weekday → weekday_office
4. otherwise unknown/default

Do not randomly add:
- shopping
- delivery
- flights
- red meat
- special events
- long travel

Only add them if pattern supports it.

## Confidence scoring

Activity confidence:
- confirmed by user: 0.90
- parsed from free text: 0.75
- assumed from same-day pattern: 0.70
- estimated from profile: 0.45–0.65
- unknown fallback: 0.25

Day confidence:
```ts
confidence =
  0.15
  + 0.40 * confirmedShare
  + 0.15 * parsedShare
  + 0.20 * profileConfidence
  - 0.25 * estimatedShare
```
Clamp 0.05–0.98.

Confidence is trust score, not an emission multiplier.

## LeafPoints principle
Reward awareness and data quality, not fake green claims.

LeafPoints should reward:
- sharing commute detail
- sharing meal source
- sharing food type
- sharing energy usage
- sharing delivery/shopping details
- sharing waste details
- natural-language update
- correcting estimated activities
- confirming auto-filled day
- improving profile confidence
- confirming learned routines
- weekly review

Do not directly reward:
- walked instead of scooter
- ate vegetarian
- avoided delivery
- reduced AC
- recycled

Those affect Green Impact and visuals only.

## Points table

Daily data:
- open Today Trail: +5
- share commute detail: +10
- share meal source: +10
- share food type: +10
- share energy usage: +10
- share shopping/delivery detail: +10
- share waste detail: +10
- natural-language update: +15
- complete daily reflection: +30

Profile:
- add commute mode: +20
- add commute distance: +20
- add electricity estimate: +20
- add diet pattern: +20
- confirm learned pattern: +15
- improve profile confidence by 10%: +40

Correction:
- confirm auto-filled day: +15
- correct wrong assumption: +15
- edit estimated activity: +20

## Caps
- daily reflection once per day
- natural-language reward max twice per day
- same profile field bonus once per 30 days
- learned pattern confirmation once per pattern

## Levels
1. Seed Starter — 0
2. Tiny Sprout — 100
3. Young Sapling — 300
4. Trail Keeper — 700
5. Forest Friend — 1200
6. Carbon Mapper — 2000
7. Green Guardian — 3500
8. Climate Champion — 5500

## Day Complete modal
Show:
```text
Day Complete

LeafPoints earned: 75
+10 Commute detail shared
+10 Lunch source shared
+10 Food type shared
+10 Energy usage shared
+15 Natural language update
+20 Corrected estimated activity

Profile confidence: 64% → 69%

Green Impact:
Your choices may have saved 0.8 kg CO₂ compared to your usual routine.
```

## Required files
- `src/logic/routineEstimator.ts`
- `src/logic/confidence.ts`
- `src/logic/leafPoints.ts`
- `src/logic/greenImpact.ts`
