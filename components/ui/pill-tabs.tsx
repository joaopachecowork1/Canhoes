"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type PillTabItem = {
  badge?: string | number;
  href?: string;
  icon?: LucideIcon;
  id: string;
  label: string;
};

type PillTabsProps = {
  activeId: string;
  className?: string;
  items: ReadonlyArray<PillTabItem>;
  onSelect?: (id: string) => void;
  size?: "sm" | "md";
  stretch?: boolean;
};

const CONTAINER_CLASS =
  "overflow-hidden rounded-xl border border-white/6 bg-[var(--bg-paper-soft)] px-1.5 py-1.5";

const SCROLL_CLASS =
  "-mx-1 overflow-x-auto px-1 snap-x snap-mandatory";

const ITEM_BASE_CLASS =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 font-semibold transition-all duration-200 ease-out active:scale-[0.97] snap-start";

const ITEM_ACTIVE_CLASS =
  "border-white/10 bg-white/[0.08] text-[var(--color-text-primary)] shadow-sm";

const ITEM_IDLE_CLASS =
  "border-transparent bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--color-text-primary)]";

const BADGE_ACTIVE_CLASS =
  "bg-[var(--moss)] text-white";

const BADGE_IDLE_CLASS =
  "border border-[rgba(95,123,56,0.24)] bg-[rgba(95,123,56,0.12)] text-[var(--color-text-muted)]";

function useScrollActiveIntoView(activeId: string) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const activeElement = scroller.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeElement) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scrollLeft = activeElement.offsetLeft - scroller.offsetWidth / 2 + activeElement.offsetWidth / 2;

    scroller.scrollTo({
      left: scrollLeft,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeId]);

  return scrollRef;
}

function PillTabContent({ isActive, item, stretch }: Readonly<{ isActive: boolean; item: PillTabItem; stretch: boolean }>) {
  const Icon = item.icon;
  return (
    <>
      {Icon ? <Icon className={cn("h-4 w-4 shrink-0", stretch && "max-[419px]:hidden")} /> : null}
      <span className="truncate">{item.label}</span>
      {item.badge == null ? null : (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors",
            isActive ? BADGE_ACTIVE_CLASS : BADGE_IDLE_CLASS
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );
}

function PillTab({
  isActive,
  item,
  onSelect,
  size,
  stretch,
}: Readonly<{ isActive: boolean; item: PillTabItem; onSelect?: (id: string) => void; size: "sm" | "md"; stretch: boolean }>) {
  const className = cn(
    ITEM_BASE_CLASS,
    size === "sm" ? "min-h-10 text-xs" : "min-h-11 text-[13px]",
    stretch && "w-full justify-center px-2",
    isActive ? ITEM_ACTIVE_CLASS : ITEM_IDLE_CLASS
  );
  const dataActive = isActive ? "true" : undefined;
  const content = <PillTabContent isActive={isActive} item={item} stretch={stretch} />;

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onSelect?.(item.id)}
        data-active={dataActive}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onSelect?.(item.id)} aria-pressed={isActive} data-active={dataActive} className={className}>
      {content}
    </button>
  );
}

/**
 * Unified pill-style tab component.
 * Supports both button clicks (onSelect) and link navigation (item.href).
 * Used across Admin, Content Tabs, and Segment Tabs.
 */
export function PillTabs({
  activeId,
  className,
  items,
  onSelect,
  size = "sm",
  stretch = false,
}: Readonly<PillTabsProps>) {
  const scrollRef = useScrollActiveIntoView(activeId);

  return (
    <div className={cn(CONTAINER_CLASS, className)}>
      <div ref={scrollRef} className={cn(SCROLL_CLASS, stretch && "mx-0 overflow-hidden px-0 snap-none")}>
        <div
          className={cn(stretch ? "grid min-w-0 gap-1" : "flex min-w-max gap-1.5")}
          style={stretch ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}
        >
          {items.map((item) => (
            <PillTab
              key={item.id}
              isActive={item.id === activeId}
              item={item}
              onSelect={onSelect}
              size={size}
              stretch={stretch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
