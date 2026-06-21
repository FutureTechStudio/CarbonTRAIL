# Technical Architecture

## File structure

```text
src/
  app/
    App.tsx
    routes.tsx
    providers.tsx

  components/
    shell/
      AppShell.tsx
      SidebarNav.tsx
      BottomNav.tsx
      TopHeader.tsx
    cards/
      MetricCard.tsx
      LeafPointsCard.tsx
      GreenImpactCard.tsx
      StatusBadge.tsx
      ConfidenceBadge.tsx
      Banner.tsx
    ai/
      SproutChat.tsx
      QuickReplyChips.tsx
      FreeTextInput.tsx
      ParsedPreviewCard.tsx
      ClarificationCard.tsx
      ProfileContextCard.tsx
    visuals/
      TodayTrailScene.tsx
      TrailNode.tsx
      WeeklyForest.tsx
      DayTree.tsx
      MonthlyValley.tsx
      ValleyCheckpoint.tsx
      BeforeAfterLandscape.tsx
    profile/
      ProfileSection.tsx
      EditableField.tsx
      PatternCard.tsx
      DefaultDayPreview.tsx
    activity/
      ActivityCard.tsx
      ActivityTimeline.tsx

  features/
    welcome/
    baseline/
    today/
    checkin/
    profile/
    forest/
    valley/
    simulator/
    rewards/

  logic/
    factorEngine.ts
    parserFallback.ts
    checkinEngine.ts
    profileMemory.ts
    routineEstimator.ts
    confidence.ts
    leafPoints.ts
    greenImpact.ts
    visualMapper.ts

  data/
    factor-packs/generic_demo.json
    demoProfile.ts
    demoDay.ts

  storage/
    guestStore.ts
    migrations.ts

  types/
    profile.ts
    activity.ts
    points.ts
    estimates.ts

  tests/
```

## Routes
- /welcome
- /baseline
- /today
- /checkin
- /forest
- /valley
- /simulator
- /profile

Default route:
- no profile → welcome
- incomplete profile → baseline
- profile ready → today

## Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Storage
Use localStorage for MVP.

Functions:
- loadState
- saveState
- resetState
- createGuestProfile
- migrateState

## API
No required API.

Optional future adapter:
```ts
export interface AiParserAdapter {
  parseActivityText(input: string, profile: UserProfile): Promise<ParsedResult>;
}
```

Default:
- localFallbackAdapter

## Repo rules
Do not commit:
- node_modules
- dist
- .env
- large images
- videos
- Figma exports

Use SVG/CSS visuals.
Keep source assets tiny.
