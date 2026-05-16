"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Lightweight tour state. The actual step definitions and Joyride
// integration land in later commits; this commit just gives the rest
// of the app a stable hook to call.

type TourCtx = {
  active: boolean;
  stepIndex: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
};

const TourContext = createContext<TourCtx | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setStepIndex(0);
  }, []);
  const next = useCallback(() => setStepIndex(i => i + 1), []);
  const prev = useCallback(() => setStepIndex(i => Math.max(0, i - 1)), []);
  const goTo = useCallback((i: number) => setStepIndex(Math.max(0, i)), []);

  const value = useMemo(
    () => ({ active, stepIndex, start, stop, next, prev, goTo }),
    [active, stepIndex, start, stop, next, prev, goTo],
  );

  return (
    <TourContext.Provider value={value}>{children}</TourContext.Provider>
  );
}

export function useTour(): TourCtx {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour() must be used inside <TourProvider>");
  }
  return ctx;
}
