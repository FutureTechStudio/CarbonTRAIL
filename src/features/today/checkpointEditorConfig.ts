import type { TimeCheckpointId } from "@/features/today/timeCheckpoints";
import type { EditableEventType } from "@/features/today/timeCheckpointActions";

export type CheckpointEditorCopy = {
  pandaMessage: string;
  placeholder: string;
  recommendedCategoryIds: EditableEventType[];
};

const LATE_NIGHT_RECOMMENDED: EditableEventType[] = [
  "home_energy",
  "digital_devices",
  "food_meals",
  "travel_trips",
  "waste_recycling",
];

export const CHECKPOINT_EDITOR_COPY: Record<TimeCheckpointId, CheckpointEditorCopy> = {
  "01": {
    pandaMessage: "Anything late-night to log? Sleep, devices, AC, snacks, or travel?",
    placeholder: "Example: I used AC for 2 hours after midnight",
    recommendedCategoryIds: LATE_NIGHT_RECOMMENDED,
  },
  "03": {
    pandaMessage: "Any late-night energy, travel, or unusual activity around this time?",
    placeholder: "Example: Nothing happened, I was sleeping",
    recommendedCategoryIds: LATE_NIGHT_RECOMMENDED,
  },
  "05": {
    pandaMessage: "Starting early today? Log morning energy, tea, workout, or travel.",
    placeholder: "Example: I woke up early and used the geyser",
    recommendedCategoryIds: ["home_energy", "water_hot_water", "personal_care", "food_meals", "transportation"],
  },
  "07": {
    pandaMessage: "What are you having for breakfast, or what are your plans for the day?",
    placeholder: "Example: I had breakfast and left for office by scooter",
    recommendedCategoryIds: ["food_meals", "transportation", "work_study", "home_energy", "water_hot_water"],
  },
  "09": {
    pandaMessage: "Are you working from office today? How are you going to office?",
    placeholder: "Example: I took a bus to office at 8:30 AM",
    recommendedCategoryIds: ["transportation", "work_study", "food_meals", "digital_devices", "home_energy"],
  },
  "11": {
    pandaMessage: "Anything from your late morning? Work, study, short travel, snacks, or errands?",
    placeholder: "Example: I worked from office and had tea",
    recommendedCategoryIds: ["work_study", "food_meals", "digital_devices", "transportation", "shopping_purchases"],
  },
  "13": {
    pandaMessage: "How did lunch happen today?",
    placeholder: "Example: Lunch was home food, rice dal and sabji",
    recommendedCategoryIds: ["food_meals", "delivery_online_orders", "work_study", "transportation", "waste_recycling"],
  },
  "15": {
    pandaMessage: "Any afternoon errands, shopping, delivery, snacks, or extra travel?",
    placeholder: "Example: I ordered groceries in the afternoon",
    recommendedCategoryIds: ["shopping_purchases", "delivery_online_orders", "work_study", "food_meals", "transportation"],
  },
  "17": {
    pandaMessage: "Any evening commute, outing, shopping, or delivery around this time?",
    placeholder: "Example: I returned from office by auto",
    recommendedCategoryIds: ["transportation", "shopping_purchases", "delivery_online_orders", "social_leisure", "food_meals"],
  },
  "19": {
    pandaMessage: "How did your evening go? Dinner, commute, exercise, or outing?",
    placeholder: "Example: I walked to a restaurant for dinner",
    recommendedCategoryIds: ["food_meals", "transportation", "social_leisure", "delivery_online_orders", "home_energy"],
  },
  "21": {
    pandaMessage: "Dinner, AC, TV, devices, or delivery? Tell Panda what happened.",
    placeholder: "Example: I ordered chicken biryani and used AC",
    recommendedCategoryIds: ["food_meals", "home_energy", "digital_devices", "delivery_online_orders", "waste_recycling"],
  },
  "23": {
    pandaMessage: "Wrapping up the day? Log night energy, waste, devices, or final check-in.",
    placeholder: "Example: Used AC for 4 hours and recycled plastic bottles",
    recommendedCategoryIds: ["home_energy", "digital_devices", "waste_recycling", "water_hot_water", "food_meals"],
  },
};

export function checkpointEditorCopy(checkpointId: TimeCheckpointId): CheckpointEditorCopy {
  return CHECKPOINT_EDITOR_COPY[checkpointId];
}
