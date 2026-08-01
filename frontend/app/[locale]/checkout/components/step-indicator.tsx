"use client";

import { statusDotColors } from "./status-dot";
import type { SectionKey, SectionStatus } from "./section-status";

interface StepIndicatorProps {
  sections: readonly SectionKey[];
  expandedSections: string[];
  statuses: Record<SectionKey, SectionStatus>;
}

export function StepIndicator({
  sections,
  expandedSections,
  statuses,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {sections.map((section, idx) => {
        const isExpanded = expandedSections.includes(section);

        return (
          <div key={section} className="flex items-center gap-1">
            <div
              className={`size-2.5 rounded-full transition-colors ${statusDotColors[statuses[section]]} ${
                isExpanded ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
              }`}
            />
            {idx < sections.length - 1 && (
              <div className="w-3 h-px bg-muted-foreground/20" />
            )}
          </div>
        );
      })}
    </div>
  );
}
