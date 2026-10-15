/**
 * Barrel re-export for backwards compatibility.
 * Individual components live in @/lib/domains/event/components/ — prefer direct imports in new code.
 */

export { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
export { CanhoesMediaThumb } from "@/lib/domains/event/components/CanhoesMediaThumb";
export { CanhoesFileTrigger } from "@/lib/domains/event/components/CanhoesFileTrigger";
export { CanhoesFeatureCard } from "@/lib/domains/event/components/CanhoesFeatureCard";
export { getPhaseLabel as formatEventPhaseLabel } from "@/lib/canhoesEvent";
