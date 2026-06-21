# Sprout AI Check-in and Parser

## Goal
Build Sprout AI as a rule-based smart assistant for MVP. It should feel intelligent because it remembers profile details and asks only what changed.

## Check-in UI
Include:
- saved profile context card
- assistant prompt
- quick chips
- free text input
- parsed preview panel
- optional clarification
- Save only for today / Remember this pattern

## Saved profile context card
```text
Using saved profile:
- Usual commute: Scooter, 14 km
- Usual work mode: Office Mon–Thu
- Usual lunch: Home-cooked/office meal

Tell me only what changed today.
```

## Main commute prompt
If profile has commute data, ask:
```text
Did you commute on your scooter like usual today?
```
Chips:
- Yes
- No
- I worked from home
- Different travel

Free text examples:
- I pooled a ride with my colleague.
- I took an auto because it was raining.
- I went by bus today.
- I worked from home today.

## Parser detection rules

### Work mode
- work from home, wfh, stayed home → wfh
- office, went to work → office
- college, class → student

### Travel
- walked → walk
- cycle, cycled → cycle
- scooter, scooty, bike → scooter
- car → car
- pooled, carpool, colleague ride, shared ride → carpool
- auto, rickshaw → auto
- cab, taxi, uber, ola → cab
- bus → bus
- metro → metro
- train → train

### Meal source
- home food, home cooked, cooked at home, from home → home_cooked
- packed, tiffin → packed
- ordered, swiggy, zomato, delivery → ordered_online
- restaurant, dhaba, cafe, ate out, outside → restaurant
- canteen → canteen
- skipped → skipped

### Food type
- dal, sabji, rice, roti, veg → vegetarian_low_dairy
- paneer, cheese, milk, curd → veg_dairy
- egg → egg
- chicken, fish, chicken biryani → chicken_fish
- mutton, beef, red meat → red_meat

### Energy
- ac, air conditioner → AC signal
- geyser → geyser signal
- heater → heater signal
- used AC a lot → high energy

### Shopping/delivery
- parcel, amazon, flipkart, shopping, bought → shopping/delivery

### Waste
- food waste, threw food, plastic, recycled, compost → waste

### Numeric extraction
Distance:
- `14 km`
- `7km each way`
- `same route`
- `usual route`

Hours:
- `3 hours`
- `4 hrs`
- `an extra hour`

## Parsed preview examples

Input:
```text
I pooled a ride with my colleague.
```

Output:
```text
AI understood:
- Travel: Carpool / shared ride
- Replaced usual commute: Yes
- Distance: Use saved 14 km commute distance
- Data status: Confirmed today
```

Clarification:
```text
Was the carpool for the same office route?
```
Chips:
- Yes, same route
- No, different distance
- Not sure

## Remember pattern rules

Suggest profile update if wording implies routine:
- I usually work from home on Fridays.
- My office changed, now commute is 22 km.
- I normally carry lunch from home.
- I started using bus daily.

Do not update profile automatically for one-time events:
- I went to a wedding today.
- I took auto because it was raining.
- I ordered biryani tonight.

## Required files
- `src/logic/parserFallback.ts`
- `src/logic/checkinEngine.ts`
- `src/logic/profileMemory.ts`

## Required tests
- pooled ride
- WFH and chicken biryani
- auto because raining
- home lunch dal sabji
- AC for 4 hours
