"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventHandler } from "react-joyride";
import { useTour } from "@/components/tour/TourContext";
import JoyrideBoundary from "@/components/tour/JoyrideBoundary";
import { TOUR_STEPS } from "@/components/tour/steps";

// react-joyride v3 is named-export only. We lazy-load the module so it
// never runs during SSR (it touches `window` at init) and so users who
// never start the tour don't pay the bundle cost.
type JoyrideComponent = (typeof import("react-joyride"))["Joyride"];

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function TourRunner() {
  const { active, stepIndex, next, stop } = useTour();
  const [Joyride, setJoyride] = useState<JoyrideComponent | null>(null);

  useEffect(() => {
    if (!active || Joyride) return;
    let cancelled = false;
    import("react-joyride").then(mod => {
      if (!cancelled) setJoyride(() => mod.Joyride);
    });
    return () => {
      cancelled = true;
    };
  }, [active, Joyride]);

  // v3's onEvent gets a TourData payload + a Controls object. We listen
  // for step:after (advance), status finished (complete), or status
  // skipped (clean up demo data and mark done).
  const onEvent: EventHandler = useCallback(
    data => {
      const { type, action, status } = data;
      if (type === "step:after" && action === "next") {
        next();
        return;
      }
      if (status === "finished") {
        void completeTour();
        stop();
      } else if (status === "skipped") {
        void skipTour();
        stop();
      }
    },
    [next, stop],
  );

  if (!active || !Joyride) return null;

  return (
    <JoyrideBoundary onError={() => void skipTour()}>
      <Joyride
        steps={TOUR_STEPS}
        stepIndex={stepIndex}
        run={active}
        continuous
        onEvent={onEvent}
        options={{
          // 'skip' adds the skip button; 'back'/'primary' are next/back.
          buttons: ["back", "primary", "skip"],
          primaryColor: "#4f46e5",
          showProgress: true,
          zIndex: 10000,
        }}
      />
    </JoyrideBoundary>
  );
}

// Fire-and-forget finishers. We don't surface errors to the user here —
// the modal close itself is the visible feedback.
async function completeTour() {
  try {
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {
    /* network errors don't block the UI */
  }
}

async function skipTour() {
  try {
    await fetch("/api/onboarding/skip", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ phase: "tour" }),
    });
  } catch {
    /* same */
  }
}
