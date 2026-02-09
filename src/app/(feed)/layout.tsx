import type { ReactNode } from "react";

export default function FeedLayout({
  children,
  detail,
}: {
  children: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {detail}
    </div>
  );
}
