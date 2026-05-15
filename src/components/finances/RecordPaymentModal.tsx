"use client";

import { useEffect } from "react";
import PaymentEntryTab from "@/components/finances/PaymentEntryTab";

type LeadHit = { id: string; name: string; phone: string };

type Props = {
  open: boolean;
  onClose: () => void;
  // Fired after a payment is saved successfully — use it to refresh the
  // parent list AND/OR close the modal.
  onSaved?: () => void;
  prefillLead?: LeadHit;
};

// Thin shell around PaymentEntryTab. Keeps the form code in one place
// (PaymentEntryTab) while letting callers open it from a list view.
export default function RecordPaymentModal({
  open,
  onClose,
  onSaved,
  prefillLead,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-5xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Record payment</h2>
            <p className="text-xs text-slate-500">
              Phone-first lookup — type the number to link an existing
              patient, or enter a name for walk-ins.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4">
          <PaymentEntryTab
            prefillLead={prefillLead}
            onSaved={() => {
              onSaved?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
