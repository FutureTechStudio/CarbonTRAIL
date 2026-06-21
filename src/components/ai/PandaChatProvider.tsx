import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type PandaChatContextValue = {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
};

const PandaChatContext = createContext<PandaChatContextValue | null>(null);

export function PandaChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  return (
    <PandaChatContext.Provider value={{ isOpen, openChat, closeChat }}>{children}</PandaChatContext.Provider>
  );
}

export function usePandaChatController(): PandaChatContextValue {
  const ctx = useContext(PandaChatContext);
  if (!ctx) {
    throw new Error("usePandaChatController must be used within PandaChatProvider");
  }
  return ctx;
}
