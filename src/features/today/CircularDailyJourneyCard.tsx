import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDailyFootprintLevel } from "@/logic/dailyFootprintLevel";
import {
  buildTimeCheckpoints,
  nextRecommendedCheckpoint,
  reviewedCheckpointCount,
  type TimeCheckpoint,
  type TimeCheckpointStatus,
} from "@/features/today/dailyRingModel";
import { timeCheckpointIdForHour, type TimeCheckpointId } from "@/features/today/timeCheckpoints";
import type { ActivityEntry } from "@/types";
import { DailyEventScoreChart } from "@/features/today/DailyEventScoreChart";
import "./circular-daily-journey.css";

const RING_SIZE = 720;
const CENTER = RING_SIZE / 2;
const RADIUS = 252;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_LABEL: Record<TimeCheckpointStatus, string> = {
  confirmed: "Confirmed",
  assumed: "Assumed",
  predicted: "Predicted",
  estimated: "Estimated",
  missing: "Missing",
  mixed: "Mixed",
  empty: "Empty",
};

function polarToPercent(angle: number, radiusPercent = 43): { left: string; top: string } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    left: `${50 + Math.cos(rad) * radiusPercent}%`,
    top: `${50 + Math.sin(rad) * radiusPercent}%`,
  };
}

function statusClass(status: TimeCheckpointStatus): string {
  return `daily-ring-node--${status}`;
}

function checkpointBadge(status: TimeCheckpointStatus, eventCount: number): string {
  if (eventCount > 1) return `+${eventCount - 1}`;
  if (status === "confirmed") return "✓";
  if (status === "missing") return "+";
  if (status === "mixed") return "•";
  return "";
}

function CheckpointIcons({ checkpoint }: { checkpoint: TimeCheckpoint }) {
  if (checkpoint.icons.length === 0) {
    return <span className="daily-ring-node__empty-icon" aria-hidden="true">+</span>;
  }

  return (
    <span className="daily-ring-node__icons" aria-hidden="true">
      {checkpoint.icons.map((icon, index) => (
        <span key={`${icon}-${index}`}>{icon}</span>
      ))}
    </span>
  );
}

function RingCheckpointNode({
  checkpoint,
  selected,
  onClick,
}: {
  checkpoint: TimeCheckpoint;
  selected: boolean;
  onClick: () => void;
}) {
  const style = polarToPercent(checkpoint.angle);
  const badge = checkpointBadge(checkpoint.status, checkpoint.eventCount);
  const eventText =
    checkpoint.eventCount === 0
      ? checkpoint.status === "missing"
        ? "expected slot"
        : "empty slot"
      : `${checkpoint.eventCount} event${checkpoint.eventCount === 1 ? "" : "s"}, ${checkpoint.totalKg.toFixed(1)} kilograms CO2`;

  return (
    <button
      type="button"
      data-checkpoint-id={checkpoint.id}
      className={`daily-ring-node ${statusClass(checkpoint.status)} ${selected ? "daily-ring-node--selected" : ""}`}
      style={style}
      onClick={onClick}
      aria-label={`${checkpoint.label}, ${eventText}, ${STATUS_LABEL[checkpoint.status]}. Open time slot editor.`}
    >
      <span className="daily-ring-node__hit">
        <span className="daily-ring-node__bubble">
          <CheckpointIcons checkpoint={checkpoint} />
          <span className="daily-ring-node__status" aria-hidden="true">
            {badge}
          </span>
        </span>
      </span>
    </button>
  );
}

function RingCenterSummary({
  journeyTitle,
  totalKg,
  confidence,
  reviewed,
}: {
  journeyTitle: string;
  totalKg: number;
  confidence: number;
  reviewed: number;
}) {
  const footprint = getDailyFootprintLevel(totalKg);

  return (
    <div className="daily-ring-center">
      <span className="daily-ring-center__leaf" aria-hidden="true">🌿</span>
      <p className="daily-ring-center__title">{journeyTitle}</p>
      <p className="daily-ring-center__value">
        {totalKg.toFixed(1)} <span>kg CO₂</span>
      </p>
      <p
        className={`daily-ring-center__sub ${footprint.toneClass}`}
        title={`Score ${footprint.scoreRange} · ${footprint.meaning}`}
      >
        {footprint.label}
      </p>
      <div className="daily-ring-center__divider" />
      <div className="daily-ring-center__stats">
        <span>
          <strong>{Math.round(confidence * 100)}%</strong>
          Confidence
        </span>
        <span>
          <strong>{reviewed} / 12</strong>
          Time slots reviewed
        </span>
      </div>
    </div>
  );
}

function UserAvatarMarker({ target }: { target: TimeCheckpoint }) {
  const style = polarToPercent(target.angle, 40);
  return (
    <div className="daily-ring-avatar" style={style} aria-label={`Current time is near ${target.label}`}>
      <span className="daily-ring-avatar__face" aria-hidden="true">🧑</span>
    </div>
  );
}

function currentTimeCheckpointId(): TimeCheckpointId {
  return timeCheckpointIdForHour(new Date().getHours());
}

export type CircularDailyJourneyCardProps = {
  activities: ActivityEntry[];
  selectedCheckpointId?: TimeCheckpointId | null;
  totalKg: number;
  confidence: number;
  journeyTitle?: string;
  showCurrentTime?: boolean;
  dateNavigation?: {
    dateLabel: string;
    onPrevious: () => void;
    onNext: () => void;
    canGoPrevious?: boolean;
    canGoNext?: boolean;
  };
  onCheckpointClick: (checkpoint: TimeCheckpoint) => void;
};

export function CircularDailyJourneyCard({
  activities,
  selectedCheckpointId,
  totalKg,
  confidence,
  journeyTitle = "Today's Journey",
  showCurrentTime = true,
  dateNavigation,
  onCheckpointClick,
}: CircularDailyJourneyCardProps) {
  const [currentCheckpointId, setCurrentCheckpointId] = useState<TimeCheckpointId>(currentTimeCheckpointId);
  const checkpoints = buildTimeCheckpoints(activities);
  const reviewed = reviewedCheckpointCount(checkpoints);
  const nextSlot = nextRecommendedCheckpoint(checkpoints);
  const avatarTarget = checkpoints.find((checkpoint) => checkpoint.id === currentCheckpointId) ?? nextSlot;

  useEffect(() => {
    const updateCurrentSlot = () => setCurrentCheckpointId(currentTimeCheckpointId());
    updateCurrentSlot();
    const interval = window.setInterval(updateCurrentSlot, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className="daily-ring-card"
      style={{ "--ring-progress": `${Math.max(0.04, reviewed / 12) * CIRCUMFERENCE}` } as CSSProperties}
    >
      {dateNavigation ? (
        <div className="daily-ring-card__date-nav" aria-label="Day navigation">
          <button
            type="button"
            onClick={dateNavigation.onPrevious}
            disabled={dateNavigation.canGoPrevious === false}
            aria-label="Previous day"
            className="daily-ring-card__date-nav-btn"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Previous day</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <p className="daily-ring-card__date-nav-label">{dateNavigation.dateLabel}</p>
          <button
            type="button"
            onClick={dateNavigation.onNext}
            disabled={dateNavigation.canGoNext === false}
            aria-label="Next day"
            className="daily-ring-card__date-nav-btn"
          >
            <span className="hidden sm:inline">Next day</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="daily-ring-shell">
        <div className="daily-ring-map" aria-label="Daily Carbon Ring">
          <svg
            className="daily-ring-atmosphere daily-ring-atmosphere--moon"
            viewBox="0 0 80 80"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="dailyMoonSurface" cx="38%" cy="34%" r="66%">
                <stop offset="0%" stopColor="#FFF8DF" />
                <stop offset="58%" stopColor="#E8EEF5" />
                <stop offset="100%" stopColor="#BFC7D2" />
              </radialGradient>
              <mask id="dailyMoonCrescent">
                <rect width="80" height="80" fill="black" />
                <circle cx="34" cy="40" r="30" fill="white" />
                <circle cx="48" cy="34" r="31" fill="black" />
              </mask>
            </defs>
            <circle cx="34" cy="40" r="30" fill="url(#dailyMoonSurface)" mask="url(#dailyMoonCrescent)" />
            <g mask="url(#dailyMoonCrescent)" opacity="0.38">
              <circle cx="24" cy="29" r="3.2" fill="#9EA9B5" />
              <circle cx="20" cy="46" r="4.4" fill="#AAB4BF" />
              <circle cx="35" cy="56" r="2.8" fill="#9EA9B5" />
              <circle cx="36" cy="36" r="2.2" fill="#B2BAC4" />
            </g>
          </svg>
          <span className="daily-ring-atmosphere daily-ring-atmosphere--sun" aria-hidden="true" />

          <div className="daily-ring-map__sky" aria-hidden="true">
            <span className="daily-ring-map__house daily-ring-map__house--night">🏘️</span>
            <span className="daily-ring-map__house daily-ring-map__house--morning">🏡</span>
            <span className="daily-ring-map__tree daily-ring-map__tree--left">🌳</span>
            <span className="daily-ring-map__tree daily-ring-map__tree--bottom">🌲</span>
          </div>

          <svg className="daily-ring-map__ring" viewBox={`0 0 ${720} ${720}`} aria-hidden="true">
            <circle cx={CENTER} cy={CENTER} r={RADIUS + 18} className="daily-ring-map__track-outer" />
            <circle cx={CENTER} cy={CENTER} r={RADIUS} className="daily-ring-map__track-shadow" />
            <circle cx={CENTER} cy={CENTER} r={RADIUS} className="daily-ring-map__track" />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              className="daily-ring-map__progress"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            />
            {[35, 125, 215, 305].map((angle) => {
              const point = polarToPercent(angle, 35);
              return (
                <foreignObject
                  key={angle}
                  x={`${Number.parseFloat(point.left) * 7.2 - 13}`}
                  y={`${Number.parseFloat(point.top) * 7.2 - 13}`}
                  width="26"
                  height="26"
                >
                  <span className="daily-ring-map__arrow">→</span>
                </foreignObject>
              );
            })}
          </svg>

          <span className="daily-ring-time daily-ring-time--top">6 AM</span>
          <span className="daily-ring-time daily-ring-time--right">12 PM</span>
          <span className="daily-ring-time daily-ring-time--bottom">6 PM</span>
          <span className="daily-ring-time daily-ring-time--left">12 AM</span>

          {checkpoints.map((checkpoint) => (
            <RingCheckpointNode
              key={checkpoint.id}
              checkpoint={checkpoint}
              selected={selectedCheckpointId === checkpoint.id}
              onClick={() => onCheckpointClick(checkpoint)}
            />
          ))}

          {showCurrentTime ? <UserAvatarMarker target={avatarTarget} /> : null}

          <RingCenterSummary
            journeyTitle={journeyTitle}
            totalKg={totalKg}
            confidence={confidence}
            reviewed={reviewed}
          />
        </div>
      </div>

      <DailyEventScoreChart activities={activities} />
    </section>
  );
}
