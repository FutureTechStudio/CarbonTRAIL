import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGuest } from "@/app/providers";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { LeafPointsCard } from "@/components/cards/LeafPointsCard";
import { CircularDailyJourneyCard } from "@/features/today/CircularDailyJourneyCard";
import { buildTimeCheckpoints } from "@/features/today/dailyRingModel";
import { PandaComposerCard } from "@/features/today/PandaComposerCard";
import { TimeCheckpointEditor } from "@/features/today/TimeCheckpointEditor";
import { TodayCarbonChoices } from "@/features/today/TodayCarbonChoices";
import { TodayLandscape } from "@/features/today/TodayLandscape";
import {
  deleteTimeCheckpointEvent,
  markTimeCheckpointEmpty,
  saveTimeCheckpointEvent,
  type TimeCheckpointEventInput,
} from "@/features/today/timeCheckpointActions";
import type { TimeCheckpointId } from "@/features/today/timeCheckpoints";
import { getCarbonChoices } from "@/features/today/todayHelpers";
import {
  createEmptyActivityDay,
  formatActivitiesTitle,
  formatDateKeyShort,
  formatJourneyTitle,
  shiftDateKey,
} from "@/features/today/todayDateView";
import { finalizeActivityDay } from "@/logic/activityBuilder";
import { estimateDayFromProfile } from "@/logic/routineEstimator";
import { PAGE_SHELL } from "@/theme/palette";

type DailyTrailViewProps = {
  viewDate: string;
  showLandscape?: boolean;
  headerBanner?: ReactNode;
  promptRequest?: { id: number; text: string } | null;
  onDateChange?: (dateKey: string) => void;
};

export function DailyTrailView({
  viewDate,
  showLandscape = true,
  headerBanner,
  promptRequest = null,
  onDateChange,
}: DailyTrailViewProps) {
  const { state, todayDate, todayDay, saveDay } = useGuest();
  const isViewingToday = viewDate === todayDate;
  const storedDay = state.days[viewDate];
  const fallbackEmptyDay = useMemo(() => {
    if (!state.profile || storedDay || isViewingToday) return undefined;
    return createEmptyActivityDay(state.profile, viewDate);
  }, [isViewingToday, state.profile, storedDay, viewDate]);
  const activeDay = storedDay ?? (isViewingToday ? todayDay : fallbackEmptyDay);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<TimeCheckpointId | null>(null);
  const [pandaExpanded, setPandaExpanded] = useState(true);
  const [localPromptRequest, setLocalPromptRequest] = useState<{ id: number; text: string } | null>(null);
  const activePromptRequest = promptRequest ?? localPromptRequest;

  useEffect(() => {
    if (!state.profile || !isViewingToday || storedDay || todayDay) return;
    saveDay(estimateDayFromProfile(state.profile, todayDate));
  }, [isViewingToday, saveDay, state.profile, storedDay, todayDate, todayDay]);

  const confirmActivity = useCallback(
    (activityId: string) => {
      if (!state.profile || !activeDay) return;
      const updated = {
        ...activeDay,
        activities: activeDay.activities.map((activity) =>
          activity.id === activityId &&
          (activity.status === "estimated_from_profile" || activity.status === "parsed_pending")
            ? { ...activity, status: "confirmed" as const, source: "manual_edit" as const }
            : activity,
        ),
        updatedAt: new Date().toISOString(),
      };
      saveDay(finalizeActivityDay(updated, state.profile));
    },
    [activeDay, saveDay, state.profile],
  );

  const openPandaCard = useCallback(() => {
    setPandaExpanded(true);
  }, []);

  const currentCheckpoints = useMemo(
    () => (activeDay ? buildTimeCheckpoints(activeDay.activities) : []),
    [activeDay],
  );

  const selectedCheckpoint = useMemo(
    () => currentCheckpoints.find((checkpoint) => checkpoint.id === selectedCheckpointId) ?? null,
    [currentCheckpoints, selectedCheckpointId],
  );

  const saveCheckpointEvent = useCallback(
    (input: TimeCheckpointEventInput) => {
      if (!state.profile || !activeDay || !selectedCheckpoint) return;
      saveDay(saveTimeCheckpointEvent({ day: activeDay, profile: state.profile, checkpoint: selectedCheckpoint, input }));
    },
    [activeDay, saveDay, selectedCheckpoint, state.profile],
  );

  const deleteCheckpointEvent = useCallback(
    (activityId: string) => {
      if (!state.profile || !activeDay) return;
      saveDay(deleteTimeCheckpointEvent({ day: activeDay, profile: state.profile, activityId }));
    },
    [activeDay, saveDay, state.profile],
  );

  const markCheckpointEmpty = useCallback(() => {
    if (!state.profile || !activeDay || !selectedCheckpoint) return;
    saveDay(markTimeCheckpointEmpty({ day: activeDay, profile: state.profile, checkpoint: selectedCheckpoint }));
    setSelectedCheckpointId(null);
  }, [activeDay, saveDay, selectedCheckpoint, state.profile]);

  const typeWithPanda = useCallback((text: string) => {
    setPandaExpanded(true);
    setLocalPromptRequest({ id: Date.now(), text });
    setSelectedCheckpointId(null);
  }, []);

  const carbonChoices = useMemo(
    () => (activeDay ? getCarbonChoices(activeDay.activities) : []),
    [activeDay],
  );

  if (!state.profile || !activeDay) {
    return <div className="p-6 text-sm">Preparing your trail...</div>;
  }

  const confidence = activeDay.totals.confidence;
  const dateNavigation = onDateChange
    ? {
        dateLabel: formatDateKeyShort(viewDate),
        onPrevious: () => onDateChange(shiftDateKey(viewDate, -1)),
        onNext: () => onDateChange(shiftDateKey(viewDate, 1)),
        canGoPrevious: true,
        canGoNext: viewDate < todayDate,
      }
    : undefined;

  const content = (
    <div className={`relative z-10 ${PAGE_SHELL} px-4 pb-24 pt-3 sm:px-5 lg:px-6 lg:pb-8 lg:pt-4`}>
      {headerBanner}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.78fr)] xl:gap-6">
        <div className="order-1 min-w-0 xl:col-start-1 xl:row-start-1">
          <CircularDailyJourneyCard
            activities={activeDay.activities}
            selectedCheckpointId={selectedCheckpointId}
            totalKg={activeDay.totals.createdCo2eKg}
            confidence={confidence}
            journeyTitle={formatJourneyTitle(viewDate, todayDate)}
            showCurrentTime={isViewingToday}
            dateNavigation={dateNavigation}
            onCheckpointClick={(checkpoint) => setSelectedCheckpointId(checkpoint.id)}
          />
        </div>

        <aside className="order-2 min-w-0 space-y-3 xl:sticky xl:top-4 xl:col-start-2 xl:row-span-2 xl:self-start">
          <PandaComposerCard
            key={viewDate}
            expanded={pandaExpanded}
            onExpandedChange={setPandaExpanded}
            promptRequest={activePromptRequest}
            viewDate={viewDate}
          />

          <TodayCarbonChoices
            choices={carbonChoices}
          />

          <LeafPointsCard />
        </aside>

        <div className="order-3 min-w-0 space-y-5 xl:col-start-1 xl:row-start-2">
          <ActivityTimeline
            activities={activeDay.activities}
            title={formatActivitiesTitle(viewDate, todayDate)}
            onConfirmActivity={confirmActivity}
            onEditActivity={openPandaCard}
          />
        </div>
      </section>

      <TimeCheckpointEditor
        checkpoint={selectedCheckpoint}
        onClose={() => setSelectedCheckpointId(null)}
        onSave={saveCheckpointEvent}
        onDelete={deleteCheckpointEvent}
        onConfirm={confirmActivity}
        onMarkEmpty={markCheckpointEmpty}
        onTypeWithPanda={typeWithPanda}
      />
    </div>
  );

  if (!showLandscape) {
    return <div className="relative min-h-full overflow-x-hidden">{content}</div>;
  }

  return (
    <div className="relative min-h-full overflow-x-hidden">
      <TodayLandscape />
      {content}
    </div>
  );
}
