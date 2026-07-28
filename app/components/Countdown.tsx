"use client";

import { useEffect, useState } from "react";

function formatRemaining(closesAt: string) {
  const delta = new Date(closesAt).getTime() - Date.now();
  if (delta <= 0) return "Market closed";
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  return `${days}D ${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
}

export function Countdown({ closesAt }: { closesAt: string }) {
  const [label, setLabel] = useState(() => formatRemaining(closesAt));
  useEffect(() => {
    const timer = window.setInterval(
      () => setLabel(formatRemaining(closesAt)),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, [closesAt]);
  return (
    <div className="countdown">
      <span>Trading closes in</span>
      <strong>{label}</strong>
    </div>
  );
}
