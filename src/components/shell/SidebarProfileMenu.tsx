import { ChevronUp, LogOut, User, UserPlus } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useGuest } from "@/app/providers";
import {
  getProfileDisplayName,
  getProfileDisplaySubtitle,
  getProfileInitials,
} from "@/components/shell/profileDisplay";
import { getLevelProgress } from "@/logic/leafPoints";
import { P } from "@/theme/palette";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300";

type SidebarProfileMenuProps = {
  collapsed: boolean;
};

export function SidebarProfileMenu({ collapsed }: SidebarProfileMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { state, resetAll, signOut } = useGuest();
  const profile = state.profile;
  const [open, setOpen] = useState(false);

  const displayName = getProfileDisplayName(profile);
  const subtitle = getProfileDisplaySubtitle(profile);
  const initials = getProfileInitials(profile);
  const confidence = Math.round((profile?.stats.profileConfidence ?? 0) * 100);
  const points = profile?.stats.totalLeafPoints ?? 0;
  const levelProgress = getLevelProgress(points);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu, open]);

  const handleSignOut = () => {
    signOut();
    closeMenu();
    navigate("/welcome");
  };

  const handleClearGuestData = () => {
    if (!window.confirm("Clear all guest data and return to welcome?")) return;
    resetAll();
    closeMenu();
    navigate("/welcome");
  };

  const handleGuestSignUp = () => {
    closeMenu();
    navigate("/welcome?mode=signup");
  };

  return (
    <div ref={rootRef} className="relative mt-auto border-t border-white/10 p-3">
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Profile and settings"
          className={`absolute bottom-full z-20 mb-2 overflow-hidden rounded-2xl border shadow-xl ${
            collapsed ? "left-2 w-56" : "inset-x-3"
          }`}
          style={{ background: "#243429", borderColor: "rgba(255,255,255,0.12)" }}
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">{displayName}</p>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-green-200/80">{subtitle}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-green-200/70">{confidence}% profile confidence</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-green-100/75">Leaf Points</p>
                <p className="text-xs font-bold text-white">{points.toLocaleString()}</p>
              </div>
              <p className="mt-1 text-[11px] text-green-200/75">
                Level {levelProgress.level} · {levelProgress.levelName}
              </p>
            </div>
          </div>

          <div className="py-1">
            <NavLink
              to="/profile"
              role="menuitem"
              onClick={closeMenu}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm text-green-50 transition hover:bg-white/8 ${FOCUS_RING}`}
            >
              <User size={16} aria-hidden="true" />
              My Carbon Memory
            </NavLink>
          </div>

          {profile?.mode === "guest" ? (
            <div className="border-t border-white/10 py-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleGuestSignUp}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-green-50 transition hover:bg-white/8 ${FOCUS_RING}`}
              >
                <UserPlus size={16} aria-hidden="true" />
                Sign up to save trail
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleClearGuestData}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-200 transition hover:bg-white/8 ${FOCUS_RING}`}
              >
                <LogOut size={16} aria-hidden="true" />
                Clear guest data
              </button>
            </div>
          ) : profile?.mode === "authenticated" ? (
            <div className="border-t border-white/10 py-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-200 transition hover:bg-white/8 ${FOCUS_RING}`}
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        title={collapsed ? displayName : undefined}
        className={`flex w-full items-center rounded-xl transition hover:bg-white/8 ${FOCUS_RING} ${
          collapsed ? "justify-center p-2" : "gap-3 px-2 py-2"
        } ${open ? "bg-white/10" : ""}`}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: `${P.leaf}33`, color: "#e8f5ec", border: "1px solid rgba(255,255,255,0.14)" }}
          aria-hidden="true"
        >
          {initials}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
              <span className="block truncate text-[11px] text-green-200/75">
                {points.toLocaleString()} Leaf Points · L{levelProgress.level}
              </span>
            </span>
            <ChevronUp
              size={16}
              className={`shrink-0 text-green-200/80 transition ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>
    </div>
  );
}
