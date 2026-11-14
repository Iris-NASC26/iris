"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const steps = [
  {
    eyebrow: "Welcome to Iris",
    title: "Your Earth-system investigation workspace",
    text: "Practice build: browse approved variables, retrieve raw NASA POWER data and inspect source metadata. Trend analysis remains unavailable.",
    icon: "globe" as const,
  },
  {
    eyebrow: "Ask in plain language",
    title: "Begin with System Intelligence",
    text: "Describe an environmental topic. A local rule-based assistant suggests approved variables for your confirmation; no AI service is called.",
    icon: "sparkles" as const,
  },
  {
    eyebrow: "Inspect before analysis",
    title: "Preview every source and observation",
    text: "Check units, coverage, quality flags, time range, and geographic bounds before drawing a conclusion.",
    icon: "layers" as const,
  },
  {
    eyebrow: "Separate signal from noise",
    title: "Plot, test, and follow the next clue",
    text: "Inspect raw monthly series and globe fields. Deseasonalization, trend inference, case files and forecasts require later scientific review.",
    icon: "activity" as const,
  },
];

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = closeButton.current?.closest('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  const current = steps[step];

  return (
    <div className="tour-backdrop" role="presentation">
      <section
        aria-describedby="iris-tour-description"
        aria-labelledby="iris-tour-title"
        aria-modal="true"
        className="tour-dialog"
        role="dialog"
      >
        <button
          aria-label="Skip onboarding"
          className="tour-close"
          onClick={onClose}
          ref={closeButton}
          type="button"
        >
          ×
        </button>
        <div className="tour-visual">
          <span className="tour-orbit tour-orbit-one" />
          <span className="tour-orbit tour-orbit-two" />
          <div>
            <Icon name={current.icon} size={34} />
          </div>
        </div>
        <div className="tour-copy">
          <span>{current.eyebrow}</span>
          <h2 id="iris-tour-title">{current.title}</h2>
          <p id="iris-tour-description">{current.text}</p>
        </div>
        <div className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => (
            <i className={index <= step ? "active" : ""} key={item.title} />
          ))}
        </div>
        <div className="tour-actions">
          <button className="tour-skip" onClick={onClose} type="button">
            Skip tour
          </button>
          <div>
            {step > 0 && (
              <button
                className="tour-back"
                onClick={() => setStep((value) => value - 1)}
                type="button"
              >
                Back
              </button>
            )}
            <button
              className="tour-next"
              onClick={() => {
                if (step === steps.length - 1) onClose();
                else setStep((value) => value + 1);
              }}
              type="button"
            >
              {step === steps.length - 1 ? "Start exploring" : "Next"}
              <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
