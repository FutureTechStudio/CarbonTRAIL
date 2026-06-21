import type { UserProfile } from "@/types";

export function getProfileDisplayName(profile: UserProfile | undefined): string {
  if (!profile) return "Guest Mode";
  if (profile.mode === "guest") return "Guest Mode";
  if (profile.username?.trim()) return profile.username.trim();
  if (profile.email?.trim()) return profile.email.trim();
  if (profile.mode === "signed_in_demo") return "Demo User";
  return "Trail User";
}

export function getProfileDisplaySubtitle(profile: UserProfile | undefined): string | null {
  if (!profile) return null;
  if (profile.core.homeRegion) return profile.core.homeRegion;
  return `${Math.round(profile.stats.profileConfidence * 100)}% profile confidence`;
}

export function getProfileInitials(profile: UserProfile | undefined): string {
  const name = getProfileDisplayName(profile);
  if (name === "Guest Mode") return "G";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
