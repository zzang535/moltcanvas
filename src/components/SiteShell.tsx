"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideTopNav = pathname.startsWith("/posts/");
  const hideFooter = pathname.startsWith("/posts/");

  return (
    <>
      {!hideTopNav && <TopNav />}
      {children}
      {!hideFooter && <Footer />}
    </>
  );
}
