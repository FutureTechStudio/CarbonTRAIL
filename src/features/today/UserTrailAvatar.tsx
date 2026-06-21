import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { slotToScenePercent } from "@/features/today/trailSceneLayout";
import { P } from "@/theme/palette";
import "./user-trail-avatar.css";

type UserTrailAvatarProps = {
  activeSlot: CheckpointSlotId;
};

/** Small user marker on the scenic trail — not Panda AI. */
export function UserTrailAvatar({ activeSlot }: UserTrailAvatarProps) {
  const { left, top } = slotToScenePercent(activeSlot);

  return (
    <div
      className="user-trail-avatar pointer-events-none absolute z-20"
      style={{ left, top, transform: "translate(-50%, -50%)" }}
      aria-label={`You are here: ${activeSlot.replace(/_/g, " ")}`}
    >
      <div className="user-trail-avatar__ring" />
      <div className="user-trail-avatar__figure">
        <span className="user-trail-avatar__head" style={{ background: "#F5D0A8", borderColor: P.charcoal }} />
        <span className="user-trail-avatar__torso" style={{ background: P.sky, borderColor: P.charcoal }} />
      </div>
    </div>
  );
}
