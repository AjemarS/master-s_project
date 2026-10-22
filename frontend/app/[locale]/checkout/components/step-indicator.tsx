"use client";

import { statusDotColors } from "./status-dot";
import type { SectionKey, SectionStatus } from "./section-status";

interface StepIndicatorProps {
  sections: readonly SectionKey[];
  expandedSections: string[];
  statuses: Record<SectionKey, SectionStatus>;
  /** Section name and status words, so the dots are not colour-only */
  labelOf: (section: SectionKey) => string;
  statusLabel: (status: SectionStatus) => string;
  ariaLabel: string;
}

export function StepIndicator({
  sections,
  expandedSections,
  statuses,
  labelOf,
  statusLabel,
  ariaLabel,
}: StepIndicatorProps) {
  return (
    <ol aria-label={ariaLabel} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      {sections.map((section, idx) => {
        const isExpanded = expandedSections.includes(section);
        const text = `${labelOf(section)}: ${statusLabel(statuses[section])}`;

        return (
          <li key={section} className="flex items-center gap-1" aria-current={isExpanded ? "step" : undefined} title={text}>
            <span
              aria-hidden
              className={`size-2.5 rounded-full transition-colors ${statusDotColors[statuses[section]]} ${
                isExpanded ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
              }`}
            />
            <span className="sr-only">{text}</span>
            {idx < sections.length - 1 && (
              <span aria-hidden className="w-3 h-px bg-muted-foreground/20" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
