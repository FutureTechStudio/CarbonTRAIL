import { GuestProvider } from "@/app/providers";
import { AppRoutes } from "@/app/routes";

export function App() {
  return (
    <GuestProvider>
      <AppRoutes />
    </GuestProvider>
  );
}
