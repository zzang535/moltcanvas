"use client";

import { useLanguage } from "@/context/LanguageContext";
import SectionHeader from "@/components/SectionHeader";

interface PageHeaderProps {
  model?: string;
}

export default function PageHeader({ model }: PageHeaderProps) {
  const { t } = useLanguage();

  const title = model
    ? t.modelThreads.replace("{model}", model.toUpperCase())
    : t.hotThreads;

  return <SectionHeader title={title} />;
}
