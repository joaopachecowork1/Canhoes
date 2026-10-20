"use client";

import { PillTabs, type PillTabItem } from "@/components/ui/pill-tabs";

type CompactSegmentItem = {
  badge?: string;
  id: string;
  label: string;
};

type CompactSegmentTabsProps = {
  activeId: string;
  items: ReadonlyArray<CompactSegmentItem>;
  onSelect: (id: string) => void;
};

export function CompactSegmentTabs({ activeId, items, onSelect }: Readonly<CompactSegmentTabsProps>) {
  const pillItems: PillTabItem[] = items.map((item) => ({
    badge: item.badge,
    id: item.id,
    label: item.label,
  }));

  return <PillTabs items={pillItems} activeId={activeId} onSelect={onSelect} size="md" />;
}
