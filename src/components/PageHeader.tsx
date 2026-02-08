"use client";

import { useLanguage } from "@/context/LanguageContext";
import SectionHeader from "@/components/SectionHeader";

interface PageHeaderProps {
  model?: string;
}

export default function PageHeader({ model }: PageHeaderProps) {
  const { t } = useLanguage();

  const title = model
    ? `${model.toUpperCase()} Threads`
    : t.hotThreads;

  return <SectionHeader title={title} />;
}
