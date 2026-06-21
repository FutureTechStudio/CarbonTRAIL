# Testing and Submission Checklist

## Required tests
- factorEngine: commute, meal, delivery, energy, waste, day total
- parserFallback: carpool, WFH + biryani, auto due to rain, home lunch, AC hours
- checkinEngine: avoids repeated commute questions
- routineEstimator: weekday office, WFH, weekend
- confidence: confirmed/mixed/auto-filled days
- leafPoints: rewards details, caps repeated fields, does not reward green claims directly

## Manual flows
- Start as Guest → baseline → today
- refresh page → data persists
- chip answer → activity added
- free text answer → parsed preview
- save only today → profile unchanged
- remember pattern → profile updated
- skipped day → auto-fill banner
- confirm auto-fill → confidence improves
- edit profile → prompts change
- clear local data → reset app

## Responsive widths
Test:
- 360px
- 390px
- 768px
- 1024px
- 1440px

## Accessibility
- keyboard focusable chips
- visible focus ring
- labelled inputs
- status badges contain text
- aria labels for icon-only buttons
- good contrast
- reduced motion support

## Security/privacy
- no API key required
- no real secrets committed
- no exact address needed
- no bank/GPS data
- local data clear option
- .env ignored

## Repo size
- no node_modules
- no dist
- no videos
- no huge images
- no large spreadsheets
- compressed screenshots only

## Build commands
```bash
npm install
npm run lint
npm run test
npm run build
npm run preview
```

## README must include
- challenge vertical
- problem
- solution
- features
- smart assistant logic
- carbon estimation assumptions
- LeafPoints vs Green Impact
- tech stack
- setup commands
- limitations
- future scope

## Final submission rules
- public GitHub repository
- one branch only
- complete code
- README included
- repo under 10 MB
- app builds
