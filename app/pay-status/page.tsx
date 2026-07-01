"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const STATUS_CONTENT: Record<
  string,
  { title: string; body: string; tone: "success" | "pending" | "error" }
> = {
  succeeded: {
    title: "Payment received",
    body: "Thank you — your payment has been confirmed.",
    tone: "success",
  },
  requires_payment_method: {
    title: "Payment submitted",
    body: "We've recorded your payment and it's awaiting confirmation from the merchant.",
    tone: "pending",
  },
  processing: {
    title: "Payment processing",
    body: "Your payment is being processed. This page will not update automatically — please check back with the merchant.",
    tone: "pending",
  },
  failed: {
    title: "Payment failed",
    body: "Your payment didn't go through. Please try again or contact the merchant.",
    tone: "error",
  },
  cancelled: {
    title: "Payment cancelled",
    body: "This payment was cancelled.",
    tone: "error",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't confirm your payment status. Please contact the merchant directly.",
    tone: "error",
  },
};

const TONE_COLOR: Record<string, string> = {
  success: "#10b981",
  pending: "#f59e0b",
  error: "#ef4444",
};

function PayStatusInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "error";
  const content = STATUS_CONTENT[status] ?? STATUS_CONTENT.error;
  const color = TONE_COLOR[content.tone];

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center border"
          style={{ backgroundColor: color + "20", borderColor: color + "40" }}
        >
          {content.tone === "success" ? (
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              style={{ color }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : content.tone === "pending" ? (
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              style={{ color }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              style={{ color }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xl font-light text-white">{content.title}</p>
          <p className="text-sm font-light text-white/50 leading-relaxed">
            {content.body}
          </p>
        </div>
        <p className="text-xs text-white/25 mt-4">powered by Motiq</p>
      </div>
    </div>
  );
}

export default function PayStatusPage() {
  return (
    <Suspense fallback={null}>
      <PayStatusInner />
    </Suspense>
  );
}
