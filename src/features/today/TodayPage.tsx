import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGuest } from "@/app/providers";
import { DailyTrailView } from "@/features/today/DailyTrailView";

export function TodayPage() {
  const { todayDate } = useGuest();
  const navigate = useNavigate();
  const location = useLocation();
  const [pandaPromptRequest, setPandaPromptRequest] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    const prompt = (location.state as { pandaPrompt?: string } | null)?.pandaPrompt;
    if (!prompt?.trim()) return;
    setPandaPromptRequest({ id: Date.now(), text: prompt });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  return <DailyTrailView viewDate={todayDate} promptRequest={pandaPromptRequest} />;
}
