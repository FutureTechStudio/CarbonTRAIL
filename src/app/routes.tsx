import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { isBaselineComplete } from "@/storage/guestStore";
import { useGuest } from "@/app/providers";
import { AppShell } from "@/components/shell/AppShell";
import { BaselinePage } from "@/features/baseline/BaselinePage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ForestPage } from "@/features/forest/ForestPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { TodayPage } from "@/features/today/TodayPage";
import { ValleyPage } from "@/features/valley/ValleyPage";
import { WelcomePage } from "@/features/welcome/WelcomePage";

function HomeRedirect() {
  const { state } = useGuest();
  if (!state.profile) return <Navigate to="/welcome" replace />;
  if (!isBaselineComplete(state.profile)) return <Navigate to="/baseline" replace />;
  return <Navigate to="/today" replace />;
}

function WelcomeGuard() {
  const { state } = useGuest();
  if (!state.profile) return <WelcomePage />;
  if (!isBaselineComplete(state.profile)) return <Navigate to="/baseline" replace />;
  return <Navigate to="/today" replace />;
}

function BaselineGuard() {
  const { state } = useGuest();
  if (!state.profile) return <Navigate to="/welcome" replace />;
  if (isBaselineComplete(state.profile)) return <Navigate to="/today" replace />;
  return <BaselinePage />;
}

function AppGuard() {
  const { state } = useGuest();
  if (!state.profile) return <Navigate to="/welcome" replace />;
  if (!isBaselineComplete(state.profile)) return <Navigate to="/baseline" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/welcome" element={<WelcomeGuard />} />
      <Route path="/baseline" element={<BaselineGuard />} />

      <Route element={<AppGuard />}>
        <Route path="/today" element={<TodayPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/forest" element={<ForestPage />} />
        <Route path="/valley" element={<ValleyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
