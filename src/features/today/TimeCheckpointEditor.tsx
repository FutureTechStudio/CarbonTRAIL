import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ActivityEntry } from "@/types";
import type { TimeCheckpoint } from "@/features/today/dailyRingModel";
import { isEstimatedActivity, isPredictedActivity, needsActivityConfirmation } from "@/features/today/dailyRingModel";
import type { DataStatus } from "@/types";
import { checkpointEditorCopy } from "@/features/today/checkpointEditorConfig";
import { formatTimeWindow } from "@/features/today/timeCheckpoints";
import type { EditableEventType, TimeCheckpointEventInput } from "@/features/today/timeCheckpointActions";
import { SUBTYPE_OPTIONS } from "@/ai/categoryDetailSchema";
import { formatActivityTypeLine, getActivityEmoji } from "@/features/today/todayHelpers";
import { PRIMARY_CATEGORY_LABELS } from "@/logic/categoryScoring";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

const EVENT_TYPES: Array<{ id: EditableEventType; label: string; icon: string }> = [
  { id: "transportation", label: PRIMARY_CATEGORY_LABELS.transportation, icon: "🛵" },
  { id: "food_meals", label: PRIMARY_CATEGORY_LABELS.food_meals, icon: "🥣" },
  { id: "home_energy", label: PRIMARY_CATEGORY_LABELS.home_energy, icon: "🏠" },
  { id: "cooking_energy", label: PRIMARY_CATEGORY_LABELS.cooking_energy, icon: "🍳" },
  { id: "work_study", label: PRIMARY_CATEGORY_LABELS.work_study, icon: "💻" },
  { id: "shopping_purchases", label: PRIMARY_CATEGORY_LABELS.shopping_purchases, icon: "🛍️" },
  { id: "delivery_online_orders", label: PRIMARY_CATEGORY_LABELS.delivery_online_orders, icon: "📦" },
  { id: "waste_recycling", label: PRIMARY_CATEGORY_LABELS.waste_recycling, icon: "♻️" },
  { id: "water_hot_water", label: PRIMARY_CATEGORY_LABELS.water_hot_water, icon: "🚿" },
  { id: "digital_devices", label: PRIMARY_CATEGORY_LABELS.digital_devices, icon: "💻" },
  { id: "personal_care", label: PRIMARY_CATEGORY_LABELS.personal_care, icon: "🧴" },
  { id: "household_chores", label: PRIMARY_CATEGORY_LABELS.household_chores, icon: "🧹" },
  { id: "social_leisure", label: PRIMARY_CATEGORY_LABELS.social_leisure, icon: "☕" },
  { id: "travel_trips", label: PRIMARY_CATEGORY_LABELS.travel_trips, icon: "✈️" },
  { id: "positive_avoided_actions", label: PRIMARY_CATEGORY_LABELS.positive_avoided_actions, icon: "🌿" },
  { id: "other_unknown", label: PRIMARY_CATEGORY_LABELS.other_unknown, icon: "❓" },
];

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d7a4f]";

const CARD_CLASS = "rounded-2xl border p-4";

type TimeCheckpointEditorProps = {
  checkpoint: TimeCheckpoint | null;
  onClose: () => void;
  onSave: (input: TimeCheckpointEventInput) => void;
  onDelete: (activityId: string) => void;
  onConfirm: (activityId: string) => void;
  onMarkEmpty: () => void;
  onTypeWithPanda: (text: string) => void;
};

function inferEventType(activity: ActivityEntry | null): EditableEventType {
  if (!activity) return "food_meals";
  if (activity.primaryCategory) return activity.primaryCategory;
  if (activity.category === "transport") return activity.activityType.includes("flight") ? "travel_trips" : "transportation";
  if (activity.category === "food") return "food_meals";
  if (activity.category === "delivery") return "delivery_online_orders";
  if (activity.category === "shopping") return "shopping_purchases";
  if (activity.category === "energy") return activity.activityType.includes("office") ? "work_study" : "home_energy";
  if (activity.category === "waste") return "waste_recycling";
  if (activity.category === "digital") return "digital_devices";
  return "other_unknown";
}

function defaultEventTypeForCheckpoint(checkpoint: TimeCheckpoint): EditableEventType {
  return checkpointEditorCopy(checkpoint.id).recommendedCategoryIds[0] ?? "food_meals";
}

function defaultSubtype(eventType: EditableEventType): string {
  return SUBTYPE_OPTIONS[eventType]?.[0] ?? "other";
}

function pandaPromptForCheckpoint(checkpoint: TimeCheckpoint, text: string): string {
  return `${text} around ${checkpoint.label} (${formatTimeWindow(checkpoint)})`;
}

function splitCategories(recommendedIds: EditableEventType[]) {
  const recommendedSet = new Set(recommendedIds);
  const recommended = recommendedIds
    .map((id) => EVENT_TYPES.find((type) => type.id === id))
    .filter((type): type is (typeof EVENT_TYPES)[number] => Boolean(type));
  const other = EVENT_TYPES.filter((type) => !recommendedSet.has(type.id));
  return { recommended, other };
}

function formatDetailDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const INTERNAL_DETAIL_KEYS = new Set([
  "checkpointId",
  "timeCheckpointId",
  "eventTime",
  "loggedTime",
  "timeWindowStart",
  "timeWindowEnd",
  "eventType",
  "nothingToLog",
  "estimatedFromProfile",
  "isLiveLog",
  "fragmentText",
  "followUp",
  "rawAiCategory",
  "categoryScore",
  "scoreMeaning",
  "greenScore",
  "dominantImpact",
  "parentBundleId",
  "includedInParentContext",
  "timeSlot",
  "assumedSameAsMorning",
  "location",
  "travelMode",
  "travelDistanceKm",
]);

const DETAIL_ROW_KEYS = new Set([
  "subcategory",
  "mode",
  "distanceKm",
  "purpose",
  "usualRoute",
  "mealSource",
  "foodType",
  "fulfillment",
  "durationHours",
  "extraAcHours",
  "acHours",
  "energyLevel",
  "cookingMethod",
  "workMode",
  "deviceUsageLevel",
  "purchaseType",
  "itemCondition",
  "purchaseChannel",
  "deliveryType",
  "packaging",
  "deliverySpeed",
  "wasteType",
  "wasteHandling",
  "waterTemperature",
  "usageLevel",
  "deviceType",
  "powerIntensity",
  "flightScope",
  "personalCareType",
  "hotWater",
  "choreType",
  "cleaningProducts",
  "avoidedActionType",
  "replacedAction",
  "avoidedImpactEstimate",
  "note",
]);

function getEventDetailDisplayRows(
  activity: ActivityEntry,
  eventType: EditableEventType,
): Array<{ label: string; value: string }> {
  const details = activity.details;
  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Category",
      value: EVENT_TYPES.find((type) => type.id === eventType)?.label ?? PRIMARY_CATEGORY_LABELS[eventType],
    },
    { label: "Label", value: activity.label },
  ];

  const push = (label: string, value: unknown) => {
    rows.push({ label, value: formatDetailDisplayValue(value) });
  };

  if (eventType === "transportation") {
    push("Travel mode", details.mode);
    push("Distance km", details.distanceKm);
    push("Purpose", details.purpose);
    push("Usual route", details.usualRoute);
  } else if (eventType === "food_meals") {
    push("Meal type", details.subcategory);
    push("Meal source", details.mealSource);
    push("Food type", details.foodType);
    if (details.mealSource === "ordered_online" || details.mealSource === "restaurant") {
      push("Delivery / pickup", details.fulfillment);
    }
  } else if (eventType === "home_energy") {
    push("Energy type", details.subcategory);
    push("Duration (hours)", details.durationHours ?? details.extraAcHours ?? details.acHours);
    push("Usage level", details.energyLevel);
  } else if (eventType === "cooking_energy") {
    push("Cooking method", details.cookingMethod);
    push("Cooking time (hours)", details.durationHours);
  } else if (eventType === "work_study") {
    push("Location / type", details.workMode);
    push("Device usage level", details.deviceUsageLevel);
    if (details.durationHours !== undefined) push("Duration (hours)", details.durationHours);
  } else if (eventType === "shopping_purchases") {
    push("Purchase type", details.purchaseType);
    push("Condition", details.itemCondition);
    push("Channel", details.purchaseChannel);
  } else if (eventType === "delivery_online_orders") {
    push("Delivery type", details.deliveryType);
    push("Packaging level", details.packaging);
    push("Speed", details.deliverySpeed);
  } else if (eventType === "waste_recycling") {
    push("Waste type", details.wasteType);
    push("Handling", details.wasteHandling);
  } else if (eventType === "water_hot_water") {
    push("Activity type", details.subcategory);
    push("Hot / cold", details.waterTemperature);
    push("Duration (hours)", details.durationHours);
    push("Usage level", details.usageLevel);
  } else if (eventType === "digital_devices") {
    push("Device / activity", details.deviceType);
    push("Duration (hours)", details.durationHours);
    push("Power intensity", details.powerIntensity);
  } else if (eventType === "travel_trips") {
    push("Mode", details.mode);
    push("Trip type", details.subcategory);
    push("Distance km", details.distanceKm);
    if (details.mode === "flight") push("Flight scope", details.flightScope);
  } else if (eventType === "personal_care") {
    push("Care type", details.personalCareType);
    push("Hot water", details.hotWater);
  } else if (eventType === "household_chores") {
    push("Chore type", details.choreType);
    push("Products used", details.cleaningProducts);
  } else if (eventType === "social_leisure") {
    push("Activity type", details.subcategory);
    push("Travel mode", details.mode);
  } else if (eventType === "positive_avoided_actions") {
    push("Avoided action", details.avoidedActionType);
    push("What it replaced", details.replacedAction);
    push("Estimated avoided impact", details.avoidedImpactEstimate ?? details.greenScore);
  } else if (details.note) {
    push("Notes", details.note);
  }

  for (const [key, value] of Object.entries(details)) {
    if (DETAIL_ROW_KEYS.has(key) || INTERNAL_DETAIL_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object") continue;
    rows.push({ label: formatDetailDisplayValue(key), value: formatDetailDisplayValue(value) });
  }

  return rows;
}

function confirmationBadgeStatus(activity: ActivityEntry): DataStatus | null {
  if (isPredictedActivity(activity)) return "parsed_pending";
  if (isEstimatedActivity(activity)) return "estimated_from_profile";
  return null;
}

export function TimeCheckpointEditor({
  checkpoint,
  onClose,
  onSave,
  onDelete,
  onConfirm,
  onMarkEmpty,
  onTypeWithPanda,
}: TimeCheckpointEditorProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<ActivityEntry | null>(null);
  const [eventType, setEventType] = useState<EditableEventType>("food_meals");
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [pandaText, setPandaText] = useState("");
  const [showOtherCategories, setShowOtherCategories] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    const checkpointId = checkpoint?.id;
    onClose();
    if (checkpointId) {
      requestAnimationFrame(() => {
        const trigger = document.querySelector<HTMLElement>(`[data-checkpoint-id="${checkpointId}"]`);
        trigger?.focus();
      });
    }
  }, [checkpoint?.id, onClose]);

  useEffect(() => {
    if (!checkpoint) return;
    const defaultType = defaultEventTypeForCheckpoint(checkpoint);
    setEditing(null);
    setEventType(defaultType);
    setLabel("");
    setDetails({ subcategory: defaultSubtype(defaultType) });
    setPandaText("");
    setShowOtherCategories(false);
    setViewingId(null);
  }, [checkpoint]);

  useEffect(() => {
    if (!checkpoint) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [checkpoint, handleClose]);

  const checkpointCopy = useMemo(
    () => (checkpoint ? checkpointEditorCopy(checkpoint.id) : null),
    [checkpoint],
  );

  const { recommended: recommendedCategories, other: otherCategories } = useMemo(
    () => splitCategories(checkpointCopy?.recommendedCategoryIds ?? []),
    [checkpointCopy],
  );

  if (!checkpoint || !checkpointCopy) return null;

  const startEdit = (activity: ActivityEntry) => {
    const nextType = inferEventType(activity);
    setViewingId(null);
    setEditing(activity);
    setEventType(nextType);
    setShowOtherCategories(!checkpointCopy.recommendedCategoryIds.includes(nextType));
    setLabel(activity.label);
    setDetails(activity.details);
  };

  const toggleView = (activity: ActivityEntry) => {
    setEditing(null);
    setViewingId((current) => (current === activity.id ? null : activity.id));
  };

  const viewingActivity = viewingId ? checkpoint.events.find((activity) => activity.id === viewingId) ?? null : null;

  const selectCategory = (typeId: EditableEventType) => {
    setEventType(typeId);
    setDetails({ subcategory: defaultSubtype(typeId) });
  };

  const updateDetail = (key: string, value: unknown) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const submitPanda = () => {
    const trimmed = pandaText.trim();
    if (!trimmed) return;
    onTypeWithPanda(pandaPromptForCheckpoint(checkpoint, trimmed));
    setPandaText("");
  };

  const handleSubmit = () => {
    const nextDetails = {
      ...details,
      subcategory: typeof details.subcategory === "string" ? details.subcategory : defaultSubtype(eventType),
    };
    onSave({
      id: editing?.id,
      eventType,
      label,
      details: nextDetails,
    });
    setEditing(null);
    setViewingId(null);
    const defaultType = defaultEventTypeForCheckpoint(checkpoint);
    setEventType(defaultType);
    setLabel("");
    setDetails({ subcategory: defaultSubtype(defaultType) });
    setShowOtherCategories(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/24 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={handleClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[92vh] w-full max-w-4xl overflow-x-hidden overflow-y-auto rounded-t-[1.5rem] border p-6 shadow-2xl sm:rounded-[1.5rem] ${FOCUS_RING}`}
        style={{ background: P.card, borderColor: P.border }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-extrabold leading-tight"
              style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}
            >
              Add events around {checkpoint.label}
            </h2>
            <p className="mt-1 text-sm" style={{ color: P.mutedText }}>
              {formatTimeWindow(checkpoint)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close checkpoint editor"
            className={`inline-flex h-11 shrink-0 items-center rounded-xl border px-3 text-xs font-semibold ${FOCUS_RING}`}
            style={{ borderColor: P.border, color: P.charcoal, background: "rgba(255,255,255,0.72)" }}
          >
            Close
          </button>
        </header>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] lg:items-start">
          <ExistingEventsSection
            checkpoint={checkpoint}
            className="order-4 lg:order-none lg:col-start-1 lg:row-start-1"
            viewingId={viewingId}
            onToggleView={toggleView}
            onEdit={startEdit}
            onDelete={(activityId) => {
              setViewingId((current) => (current === activityId ? null : current));
              onDelete(activityId);
            }}
            onConfirm={onConfirm}
            onMarkEmpty={onMarkEmpty}
          />

          <PandaSection
            className="order-2 lg:order-none lg:col-start-1 lg:row-start-2"
            pandaMessage={checkpointCopy.pandaMessage}
            placeholder={checkpointCopy.placeholder}
            pandaText={pandaText}
            onPandaTextChange={setPandaText}
            onSubmit={submitPanda}
          />

          <ManualFormSection
            className="order-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2"
            checkpointLabel={checkpoint.label}
            editing={editing}
            viewing={viewingActivity}
            eventType={eventType}
            label={label}
            details={details}
            recommendedCategories={recommendedCategories}
            otherCategories={otherCategories}
            showOtherCategories={showOtherCategories}
            onShowOtherCategories={() => setShowOtherCategories(true)}
            onHideOtherCategories={() => setShowOtherCategories(false)}
            onSelectCategory={selectCategory}
            onLabelChange={setLabel}
            onDetailChange={updateDetail}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </div>
  );
}

function ExistingEventsSection({
  checkpoint,
  className,
  viewingId,
  onToggleView,
  onEdit,
  onDelete,
  onConfirm,
  onMarkEmpty,
}: {
  checkpoint: TimeCheckpoint;
  className?: string;
  viewingId: string | null;
  onToggleView: (activity: ActivityEntry) => void;
  onEdit: (activity: ActivityEntry) => void;
  onDelete: (activityId: string) => void;
  onConfirm: (activityId: string) => void;
  onMarkEmpty: () => void;
}) {
  return (
    <section className={`${CARD_CLASS} ${className ?? ""}`} style={{ borderColor: P.border, background: "rgba(255,255,255,0.55)" }}>
      <p className="text-sm font-bold" style={{ color: P.charcoal }}>
        Existing events
      </p>
      <p className="mt-1 text-[11px]" style={{ color: P.faintText }}>
        Select an event to view its saved details on the right.
      </p>
      {checkpoint.events.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {checkpoint.events.map((activity) => {
            const selected = viewingId === activity.id;
            const badgeStatus = confirmationBadgeStatus(activity);
            const showConfirm = needsActivityConfirmation(activity);

            return (
            <li
              key={activity.id}
              className="rounded-xl border text-xs"
              style={{
                borderColor: selected ? P.green : P.border,
                background: "rgba(255,255,255,0.82)",
                boxShadow: selected ? `inset 0 0 0 1px ${P.green}` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3 p-3">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleView(activity)}
                  className={`min-w-0 flex-1 rounded-lg text-left ${FOCUS_RING}`}
                >
                  <p className="flex flex-wrap items-center gap-2 font-semibold" style={{ color: P.charcoal }}>
                    <span>
                      <span aria-hidden="true">{getActivityEmoji(activity)} </span>
                      {activity.label}
                    </span>
                    {badgeStatus ? <StatusBadge status={badgeStatus} /> : null}
                  </p>
                  <p className="mt-0.5" style={{ color: P.mutedText }}>
                    {formatActivityTypeLine(activity)}
                  </p>
                  <p className="mt-1 font-semibold" style={{ color: P.green }}>
                    {activity.estimates.co2eKg.toFixed(1)} kg CO₂
                  </p>
                </button>
                <div className="flex shrink-0 flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(activity)}
                      className={`inline-flex h-9 items-center rounded-lg border px-2.5 font-semibold ${FOCUS_RING}`}
                      style={{ borderColor: P.border, color: P.charcoal }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(activity.id)}
                      className={`inline-flex h-9 items-center rounded-lg border px-2.5 font-semibold ${FOCUS_RING}`}
                      style={{ borderColor: "#f0c4c0", color: "#B83428" }}
                    >
                      Delete
                    </button>
                  </div>
                  {showConfirm ? (
                    <button
                      type="button"
                      onClick={() => onConfirm(activity.id)}
                      className={`inline-flex h-9 items-center justify-center rounded-lg px-2.5 text-[11px] font-semibold text-white ${FOCUS_RING}`}
                      style={{ background: P.green }}
                    >
                      Confirm
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      ) : (
        <>
          <p className="mt-2 text-xs" style={{ color: P.faintText }}>
            No events yet in this time window.
          </p>
          <button
            type="button"
            onClick={onMarkEmpty}
            className={`mt-3 inline-flex h-9 items-center rounded-lg border px-3 text-[11px] font-semibold ${FOCUS_RING}`}
            style={{ borderColor: P.border, color: P.mutedText, background: "rgba(255,255,255,0.72)" }}
          >
            Nothing to log for this checkpoint.
          </button>
        </>
      )}
    </section>
  );
}

function PandaSection({
  className,
  pandaMessage,
  placeholder,
  pandaText,
  onPandaTextChange,
  onSubmit,
}: {
  className?: string;
  pandaMessage: string;
  placeholder: string;
  pandaText: string;
  onPandaTextChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className={`${CARD_CLASS} ${className ?? ""}`} style={{ borderColor: "#c8e0c4", background: P.sage }}>
      <p className="text-sm font-bold" style={{ color: P.charcoal }}>
        🐼 Panda AI
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: P.mutedText }}>
        {pandaMessage}
      </p>
      <textarea
        value={pandaText}
        onChange={(event) => onPandaTextChange(event.target.value)}
        placeholder={placeholder}
        className={`mt-3 min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm ${FOCUS_RING}`}
        style={{ borderColor: P.border, background: "rgba(255,255,255,0.88)" }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!pandaText.trim()}
        className={`mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55 ${FOCUS_RING}`}
        style={{ background: P.green }}
      >
        Log with Panda
      </button>
    </section>
  );
}

function ReadOnlyValueField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold" style={{ color: P.charcoal }}>
        {label}
      </p>
      <div
        className="mt-1 flex min-h-11 items-center rounded-xl border px-3 text-sm"
        style={{ borderColor: P.border, background: "rgba(255,255,255,0.88)", color: P.charcoal }}
      >
        {value}
      </div>
    </div>
  );
}

function EventDetailsReadOnlyPanel({ activity }: { activity: ActivityEntry }) {
  const eventType = inferEventType(activity);
  const category = EVENT_TYPES.find((type) => type.id === eventType);
  const detailRows = getEventDetailDisplayRows(activity, eventType).filter(
    (row) => row.label !== "Category" && row.label !== "Label",
  );

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border px-3 py-3"
        style={{ borderColor: `${P.green}44`, background: "rgba(248,252,250,0.88)" }}
      >
        <p className="font-semibold" style={{ color: P.charcoal }}>
          <span aria-hidden="true">{getActivityEmoji(activity)} </span>
          {activity.label}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: P.mutedText }}>
          {formatActivityTypeLine(activity)}
        </p>
        <p className="mt-1 text-xs font-semibold" style={{ color: P.green }}>
          {activity.estimates.co2eKg.toFixed(1)} kg CO₂
        </p>
      </div>

      {category ? (
        <div>
          <p className="text-xs font-semibold" style={{ color: P.mutedText }}>
            Category
          </p>
          <div className="mt-2">
            <span
              className="inline-flex h-11 items-center rounded-full border px-3 text-[11px] font-semibold"
              style={{ borderColor: P.green, background: `${P.green}14`, color: P.charcoal }}
            >
              <span aria-hidden="true">{category.icon} </span>
              {category.label}
            </span>
          </div>
        </div>
      ) : null}

      <ReadOnlyValueField label="Label" value={activity.label} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {detailRows.map((row) => (
          <ReadOnlyValueField key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function ManualFormSection({
  className,
  checkpointLabel,
  editing,
  viewing,
  eventType,
  label,
  details,
  recommendedCategories,
  otherCategories,
  showOtherCategories,
  onShowOtherCategories,
  onHideOtherCategories,
  onSelectCategory,
  onLabelChange,
  onDetailChange,
  onSubmit,
}: {
  className?: string;
  checkpointLabel: string;
  editing: ActivityEntry | null;
  viewing: ActivityEntry | null;
  eventType: EditableEventType;
  label: string;
  details: Record<string, unknown>;
  recommendedCategories: Array<(typeof EVENT_TYPES)[number]>;
  otherCategories: Array<(typeof EVENT_TYPES)[number]>;
  showOtherCategories: boolean;
  onShowOtherCategories: () => void;
  onHideOtherCategories: () => void;
  onSelectCategory: (typeId: EditableEventType) => void;
  onLabelChange: (value: string) => void;
  onDetailChange: (key: string, value: unknown) => void;
  onSubmit: () => void;
}) {
  const isViewMode = Boolean(viewing) && !editing;
  const sectionTitle = editing ? "Edit event" : isViewMode ? "Event details" : "Add event";

  return (
    <section
      className={`${CARD_CLASS} flex min-h-0 flex-col ${className ?? ""} ${
        !isViewMode && showOtherCategories
          ? "max-h-[min(560px,calc(92vh-10rem))] overflow-hidden lg:max-h-[calc(92vh-10rem)]"
          : ""
      }`}
      style={{ borderColor: P.border, background: "rgba(255,255,255,0.58)" }}
    >
      <p className="shrink-0 text-sm font-bold" style={{ color: P.charcoal }}>
        {sectionTitle}
      </p>

      {isViewMode && viewing ? (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <EventDetailsReadOnlyPanel activity={viewing} />
        </div>
      ) : (
        <>
      <div
        className={`min-h-0 ${showOtherCategories ? "mt-4 flex-1 overflow-y-auto overscroll-contain pr-1" : "mt-4"}`}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: P.mutedText }}>
            Recommended for {checkpointLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendedCategories.map((type) => (
              <CategoryChip
                key={type.id}
                type={type}
                selected={eventType === type.id}
                onSelect={() => onSelectCategory(type.id)}
              />
            ))}
          </div>
        </div>

        {otherCategories.length > 0 ? (
          <div className="mt-4">
            {showOtherCategories ? (
              <>
                <p className="text-xs font-semibold" style={{ color: P.mutedText }}>
                  Other categories
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {otherCategories.map((type) => (
                    <CategoryChip
                      key={type.id}
                      type={type}
                      selected={eventType === type.id}
                      onSelect={() => onSelectCategory(type.id)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onHideOtherCategories}
                  className={`mt-3 inline-flex h-11 items-center rounded-lg border px-3 text-xs font-semibold ${FOCUS_RING}`}
                  style={{ borderColor: P.border, color: P.mutedText, background: "rgba(255,255,255,0.72)" }}
                >
                  Show less categories
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onShowOtherCategories}
                className={`inline-flex h-11 items-center rounded-lg border px-3 text-xs font-semibold ${FOCUS_RING}`}
                style={{ borderColor: P.border, color: P.green, background: "rgba(255,255,255,0.72)" }}
              >
                Show more categories
              </button>
            )}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-semibold" style={{ color: P.charcoal }}>
          Label
          <input
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="Example: Bus to office"
            className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-normal ${FOCUS_RING}`}
            style={{ borderColor: P.border, background: "white" }}
          />
        </label>

        <DetailFields eventType={eventType} details={details} onChange={onDetailChange} />
      </div>

      <div
        className="mt-4 shrink-0 border-t pt-4"
        style={{ borderColor: `${P.border}`, background: "rgba(255,255,255,0.58)" }}
      >
        <button
          type="button"
          onClick={onSubmit}
          className={`inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white ${FOCUS_RING}`}
          style={{ background: P.green }}
        >
          Save event
        </button>
      </div>
        </>
      )}
    </section>
  );
}

function CategoryChip({
  type,
  selected,
  onSelect,
}: {
  type: (typeof EVENT_TYPES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`inline-flex h-11 items-center rounded-full border px-3 text-[11px] font-semibold ${FOCUS_RING}`}
      style={{
        borderColor: selected ? P.green : P.border,
        background: selected ? `${P.green}14` : "white",
        color: P.charcoal,
        boxShadow: selected ? `inset 0 0 0 1px ${P.green}` : undefined,
      }}
    >
      <span aria-hidden="true">{type.icon} </span>
      {type.label}
    </button>
  );
}

function DetailFields({
  eventType,
  details,
  onChange,
}: {
  eventType: EditableEventType;
  details: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const subtypeOptions = SUBTYPE_OPTIONS[eventType] ?? ["other"];

  return (
    <div className="mt-4 space-y-4">
      <CategorySpecificFields eventType={eventType} details={details} subtypeOptions={subtypeOptions} onChange={onChange} />
    </div>
  );
}

function CategorySpecificFields({
  eventType,
  details,
  subtypeOptions,
  onChange,
}: {
  eventType: EditableEventType;
  details: Record<string, unknown>;
  subtypeOptions: string[];
  onChange: (key: string, value: unknown) => void;
}) {
  if (eventType === "transportation") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Travel mode" value={String(details.mode ?? "bus")} options={["walk", "cycle", "scooter", "bus", "metro", "train", "auto", "car", "cab", "carpool"]} onChange={(value) => onChange("mode", value)} />
        <NumberField label="Distance km" value={Number(details.distanceKm ?? 5)} onChange={(value) => onChange("distanceKm", value)} />
        <SelectField label="Purpose" value={String(details.purpose ?? "commute")} options={["commute", "errand", "school", "social", "other"]} onChange={(value) => onChange("purpose", value)} />
        <ToggleField label="Usual route" checked={Boolean(details.usualRoute)} onChange={(value) => onChange("usualRoute", value)} />
      </div>
    );
  }

  if (eventType === "food_meals") {
    const mealSource = String(details.mealSource ?? "home_cooked");
    const showDeliveryPickup = mealSource === "ordered_online" || mealSource === "restaurant";
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Meal type" value={String(details.subcategory ?? subtypeOptions[0])} options={subtypeOptions} onChange={(value) => onChange("subcategory", value)} />
        <SelectField label="Meal source" value={mealSource} options={["home_cooked", "packed", "canteen", "restaurant", "ordered_online", "skipped"]} onChange={(value) => onChange("mealSource", value)} />
        <SelectField label="Food type" value={String(details.foodType ?? "vegetarian_low_dairy")} options={["plant_based", "vegetarian_low_dairy", "veg_dairy", "egg", "chicken_fish", "red_meat", "unknown"]} onChange={(value) => onChange("foodType", value)} />
        {showDeliveryPickup ? (
          <SelectField label="Delivery / pickup" value={String(details.fulfillment ?? "delivery")} options={["delivery", "pickup", "dine_in"]} onChange={(value) => onChange("fulfillment", value)} />
        ) : null}
      </div>
    );
  }

  if (eventType === "home_energy") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Energy type" value={String(details.subcategory ?? subtypeOptions[0])} options={subtypeOptions} onChange={(value) => onChange("subcategory", value)} />
        <NumberField label="Duration (hours)" value={Number(details.durationHours ?? details.extraAcHours ?? details.acHours ?? 1)} onChange={(value) => onChange("durationHours", value)} />
        <SelectField label="Usage level" value={String(details.energyLevel ?? "normal")} options={["normal", "high"]} onChange={(value) => onChange("energyLevel", value)} />
      </div>
    );
  }

  if (eventType === "cooking_energy") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Cooking method" value={String(details.cookingMethod ?? "lpg_cooking")} options={["lpg_cooking", "induction", "microwave", "oven", "air_fryer"]} onChange={(value) => onChange("cookingMethod", value)} />
        <NumberField label="Cooking time (hours)" value={Number(details.durationHours ?? 0.5)} onChange={(value) => onChange("durationHours", value)} />
      </div>
    );
  }

  if (eventType === "work_study") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Location / type" value={String(details.workMode ?? "office")} options={["office", "work_from_home", "hybrid", "school_college", "field_work"]} onChange={(value) => onChange("workMode", value)} />
        <SelectField label="Device usage level" value={String(details.deviceUsageLevel ?? "normal")} options={["low", "normal", "high"]} onChange={(value) => onChange("deviceUsageLevel", value)} />
      </div>
    );
  }

  if (eventType === "shopping_purchases") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Purchase type" value={String(details.purchaseType ?? "groceries")} options={["groceries", "clothing", "electronics", "household_item", "furniture", "cosmetics", "medicine"]} onChange={(value) => onChange("purchaseType", value)} />
        <SelectField label="Condition" value={String(details.itemCondition ?? "new")} options={["new", "used", "repaired"]} onChange={(value) => onChange("itemCondition", value)} />
        <SelectField label="Channel" value={String(details.purchaseChannel ?? "offline")} options={["online", "offline", "mixed"]} onChange={(value) => onChange("purchaseChannel", value)} />
      </div>
    );
  }

  if (eventType === "delivery_online_orders") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Delivery type" value={String(details.deliveryType ?? "groupedParcel")} options={["groupedParcel", "foodDelivery", "singleParcel", "expressDelivery"]} onChange={(value) => onChange("deliveryType", value)} />
        <SelectField label="Packaging level" value={String(details.packaging ?? "normal")} options={["none", "minimal", "normal", "plastic_heavy", "unknown"]} onChange={(value) => onChange("packaging", value)} />
        <SelectField label="Speed" value={String(details.deliverySpeed ?? "normal")} options={["normal", "express"]} onChange={(value) => onChange("deliverySpeed", value)} />
      </div>
    );
  }

  if (eventType === "waste_recycling") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Waste type" value={String(details.wasteType ?? "normalDaily")} options={["normalDaily", "foodWaste", "plasticHeavy", "recycled", "composted"]} onChange={(value) => onChange("wasteType", value)} />
        <SelectField label="Handling" value={String(details.wasteHandling ?? "normal")} options={["normal", "recycled", "composted"]} onChange={(value) => onChange("wasteHandling", value)} />
      </div>
    );
  }

  if (eventType === "water_hot_water") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Activity type" value={String(details.subcategory ?? subtypeOptions[0])} options={subtypeOptions} onChange={(value) => onChange("subcategory", value)} />
        <SelectField label="Hot / cold" value={String(details.waterTemperature ?? "cold")} options={["cold", "hot", "mixed", "unknown"]} onChange={(value) => onChange("waterTemperature", value)} />
        <NumberField label="Duration (hours)" value={Number(details.durationHours ?? 0.5)} onChange={(value) => onChange("durationHours", value)} />
        <SelectField label="Usage level" value={String(details.usageLevel ?? "normal")} options={["low", "normal", "high"]} onChange={(value) => onChange("usageLevel", value)} />
      </div>
    );
  }

  if (eventType === "digital_devices") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Device / activity" value={String(details.deviceType ?? "laptop")} options={["phone", "laptop", "desktop", "tv", "gaming_console", "router", "streaming", "gaming"]} onChange={(value) => onChange("deviceType", value)} />
        <NumberField label="Duration (hours)" value={Number(details.durationHours ?? 1)} onChange={(value) => onChange("durationHours", value)} />
        <SelectField label="Power intensity" value={String(details.powerIntensity ?? "normal")} options={["low", "normal", "high"]} onChange={(value) => onChange("powerIntensity", value)} />
      </div>
    );
  }

  if (eventType === "travel_trips") {
    const mode = String(details.mode ?? "flight");
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Mode" value={mode} options={["bus", "train", "flight", "car", "road_trip"]} onChange={(value) => onChange("mode", value)} />
        <SelectField label="Trip type" value={String(details.subcategory ?? subtypeOptions[0])} options={subtypeOptions} onChange={(value) => onChange("subcategory", value)} />
        <NumberField label="Distance km" value={Number(details.distanceKm ?? 100)} onChange={(value) => onChange("distanceKm", value)} />
        {mode === "flight" ? (
          <SelectField label="Flight scope" value={String(details.flightScope ?? "domestic")} options={["domestic", "international"]} onChange={(value) => onChange("flightScope", value)} />
        ) : null}
      </div>
    );
  }

  if (eventType === "personal_care") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Care type" value={String(details.personalCareType ?? "basic")} options={["basic", "hot_bath", "hair_dryer", "salon_visit", "cosmetics", "disposable_products"]} onChange={(value) => onChange("personalCareType", value)} />
        <SelectField label="Hot water" value={String(details.hotWater ?? "no")} options={["no", "yes", "unknown"]} onChange={(value) => onChange("hotWater", value)} />
      </div>
    );
  }

  if (eventType === "household_chores") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Chore type" value={String(details.choreType ?? "cleaning")} options={["laundry", "ironing", "dishwashing", "cleaning", "vacuuming", "repairs", "painting"]} onChange={(value) => onChange("choreType", value)} />
        <SelectField label="Products used" value={String(details.cleaningProducts ?? "unknown")} options={["none", "minimal", "yes", "unknown"]} onChange={(value) => onChange("cleaningProducts", value)} />
      </div>
    );
  }

  if (eventType === "social_leisure") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Activity type" value={String(details.subcategory ?? subtypeOptions[0])} options={subtypeOptions} onChange={(value) => onChange("subcategory", value)} />
        <SelectField label="Travel mode" value={String(details.mode ?? "walk")} options={["walk", "cycle", "bus", "metro", "auto", "car", "cab"]} onChange={(value) => onChange("mode", value)} />
      </div>
    );
  }

  if (eventType === "positive_avoided_actions") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Avoided action" value={String(details.avoidedActionType ?? "public_transport_instead")} options={["walked_instead", "public_transport_instead", "avoided_delivery", "repaired_reused", "recycled", "reduced_ac"]} onChange={(value) => onChange("avoidedActionType", value)} />
        <SelectField label="What it replaced" value={String(details.replacedAction ?? "car_trip")} options={["car_trip", "delivery", "ac_use", "new_purchase", "waste", "other"]} onChange={(value) => onChange("replacedAction", value)} />
        <NumberField label="Estimated avoided impact" value={Number(details.avoidedImpactEstimate ?? details.greenScore ?? 5)} onChange={(value) => onChange("avoidedImpactEstimate", value)} />
      </div>
    );
  }

  return (
    <label className="block text-xs font-semibold" style={{ color: P.charcoal }}>
      Notes
      <textarea
        value={String(details.note ?? "")}
        onChange={(event) => onChange("note", event.target.value)}
        className={`mt-1 min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm font-normal ${FOCUS_RING}`}
        style={{ borderColor: P.border, background: "white" }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold" style={{ color: P.charcoal }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-normal ${FOCUS_RING}`}
        style={{ borderColor: P.border, background: "white" }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-semibold" style={{ color: P.charcoal }}>
      {label}
      <input
        type="number"
        min={0}
        step={0.5}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-normal ${FOCUS_RING}`}
        style={{ borderColor: P.border, background: "white" }}
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold" style={{ borderColor: P.border, color: P.charcoal, background: "white" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-4 w-4 rounded border ${FOCUS_RING}`}
        style={{ accentColor: P.green }}
      />
      {label}
    </label>
  );
}
