# Feature Scope

## Must-have MVP

### Guest mode
- Start as Guest button.
- Generate guest profile ID.
- Persist profile, days, and points in localStorage.
- Clear local data option.
- Signup/import can be a non-functional future CTA.

### Baseline setup
Ask only:
- city/region
- household size
- usual work mode
- usual commute mode
- usual commute distance
- diet pattern
- electricity estimate
- food delivery frequency

Each question supports quick chips, custom input, and Not sure.

### My Carbon Memory
Editable user profile that stores:
- core details
- work and commute
- food routine
- energy routine
- shopping and waste
- learned patterns
- default weekday/weekend emissions
- profile confidence

### Today Dashboard
Show:
- Created Today
- Saved Today
- Net Change
- Impact Score
- Confidence
- Today Trail scene
- Activity timeline
- LeafPoints card
- Green Impact card

### Sprout AI Check-in
Must include:
- saved profile context card
- assistant message
- quick reply chips
- free text input
- parsed preview
- one clarification if needed
- Save only for today / Remember this pattern

### Free-text parser fallback
Local deterministic parser detects:
- work mode
- travel mode
- meal source
- food type
- energy signal
- delivery/shopping signal
- waste signal
- distance and hours if typed

### Routine auto-fill
If user skips a day:
- generate from profile
- mark activities estimated_from_profile
- show faded/dotted trail nodes
- show confidence banner
- allow Confirm day or Edit activities

### LeafPoints
Reward data quality:
- sharing details
- correcting assumptions
- confirming auto-filled days
- improving profile confidence
- completing reflections

### Green Impact
Separate from LeafPoints. Shows estimated CO2 saved versus baseline.

### Weekly Forest
Seven trees for seven days. Tree health is based on day score/status.

### Basic Scenario Simulator
Before/after landscape with four controls:
- reduce AC by 1 hour
- walk one short trip
- avoid one delivery
- eat home-cooked dinner

## Nice-to-have later
- Monthly Valley richness.
- Gemini API parser.
- India-specific factor pack.
- account import/export.
- device sync.
- social missions.
