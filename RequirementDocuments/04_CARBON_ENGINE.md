# Carbon Engine

## Disclaimer
Carbon estimates are approximate and for awareness only, not certified carbon accounting.

## Factor pack file
Create `src/data/factor-packs/generic_demo.json`.

```json
{
  "transport": {
    "walk": 0,
    "cycle": 0,
    "scooter": 0.11,
    "motorbike": 0.11,
    "car": 0.17,
    "carpool": 0.085,
    "auto": 0.14,
    "cab": 0.17,
    "bus": 0.10,
    "metro": 0.03,
    "train": 0.03,
    "ev": 0.03
  },
  "foodMeal": {
    "plant_based": 0.5,
    "vegetarian_low_dairy": 0.7,
    "veg_dairy": 0.9,
    "egg": 1.1,
    "chicken_fish": 1.6,
    "red_meat": 3.0,
    "unknown": 1.1
  },
  "mealSourceAdjustments": {
    "home_cooked": 0,
    "packed": 0,
    "canteen": 0.1,
    "restaurant": 0.2,
    "ordered_online": 0.35,
    "skipped": 0
  },
  "packaging": {
    "none": 0,
    "minimal": 0.05,
    "normal": 0.12,
    "plastic_heavy": 0.25,
    "unknown": 0.1
  },
  "electricity": {
    "kgPerKwh": 0.13
  },
  "delivery": {
    "groupedParcel": 0.12,
    "foodDelivery": 0.22,
    "quickCommerce": 0.18
  },
  "waste": {
    "normalDaily": 0.2,
    "plasticHeavy": 0.5,
    "foodWasteSmall": 0.3,
    "recycled": 0.05,
    "composted": 0.03
  }
}
```

## Formulas

### Transport
`transportCO2e = distanceKm * modeFactor / occupancy`

Default occupancy:
- car/cab = 1
- carpool = 2
- public transport factors already per passenger

### Food
`foodCO2e = mealBase + mealSourceAdjustment + packagingAdjustment + deliveryAdjustment`

For ordered online:
- add foodDelivery factor

For restaurant:
- if user walked, no travel
- if user drove, add separate transport entry

### Electricity
If kWh known:
`dailyKwh = monthlyKwh / 30`

If bill known:
`estimatedMonthlyKwh = monthlyBill / tariffPerKwh`

High AC:
`extraACCo2e = extraHours * 1.0 * electricityFactor`

### Waste
Use presets:
- normal = 0.2
- plastic-heavy = 0.5
- food waste small = 0.3
- recycled = 0.05
- composted = 0.03

## Impact score
```ts
function impactScoreFromCo2e(co2eKg: number): number {
  if (co2eKg <= 0.5) return 1;
  if (co2eKg <= 1.5) return 3;
  if (co2eKg <= 3) return 5;
  if (co2eKg <= 6) return 7;
  return 9;
}
```

## Trail condition
```ts
function trailCondition(score: number) {
  if (score <= 2) return "clean";
  if (score <= 4) return "light";
  if (score <= 6) return "moderate";
  if (score <= 8) return "smoky";
  return "heavy";
}
```

## Green Impact
`greenImpact = baselineCo2e - actualCo2e`

If positive, user saved footprint versus their routine.
If negative, today was higher than routine.

## Required files
- `src/logic/factorEngine.ts`
- `src/logic/greenImpact.ts`
- `src/logic/visualMapper.ts`
- `src/data/factor-packs/generic_demo.json`

## Required tests
- 14 km scooter commute
- carpool with saved commute distance
- ordered chicken meal
- walked to restaurant and ate fish/chicken
- high AC use
- normal waste
- full sample day
