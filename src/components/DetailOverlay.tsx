"use client";

import { useEffect, type ReactNode } from "react";

export default function DetailOverlay({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-molt-bg text-molt-text overscroll-contain">
      {children}
    </div>
  );
}
