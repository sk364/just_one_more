"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushPermissionBanner() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isSubscribed || permission === "granted" || permission === "denied" || permission === "unsupported") {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white text-sm">
      <Bell className="h-4 w-4 shrink-0" />
      <span className="flex-1">Enable notifications to get game reminders and updates on your phone.</span>
      <button
        onClick={subscribe}
        disabled={isLoading}
        className="shrink-0 rounded-full bg-white text-indigo-600 px-3 py-1 text-xs font-semibold hover:bg-indigo-50 disabled:opacity-60 transition-colors"
      >
        {isLoading ? "Enabling…" : "Enable"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-1 hover:bg-indigo-500 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
