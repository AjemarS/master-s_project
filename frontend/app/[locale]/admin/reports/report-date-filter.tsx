"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Calendar } from "lucide-react";

type Range = { from: string; to: string };

/** YYYY-MM-DD in the browser's local time (toISOString would shift the day to UTC) */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The last `days` days including today */
export function lastDays(days: number): Range {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(to) };
}

const PRESETS = [7, 30, 90, 365] as const;

interface ReportDateFilterProps {
  dateInput: Range;
  dateRangeError: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onPreset: (range: Range) => void;
}

export function ReportDateFilter({
  dateInput,
  dateRangeError,
  onDateChange,
  onApply,
  onReset,
  onPreset,
}: ReportDateFilterProps) {
  const t = useTranslations("reports");

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="report-from" className="text-xs text-muted-foreground">{t("dateFrom")}</Label>
            <Input
              id="report-from"
              type="date"
              value={dateInput.from}
              onChange={(e) => onDateChange("from", e.target.value)}
              aria-invalid={dateRangeError}
              className={`w-40 ${dateRangeError ? "border-red-500" : ""}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="report-to" className="text-xs text-muted-foreground">{t("dateTo")}</Label>
            <Input
              id="report-to"
              type="date"
              value={dateInput.to}
              onChange={(e) => onDateChange("to", e.target.value)}
              aria-invalid={dateRangeError}
              className={`w-40 ${dateRangeError ? "border-red-500" : ""}`}
            />
          </div>
          <Button size="sm" onClick={onApply}>
            {t("update")}
          </Button>
          <Button size="sm" variant="outline" onClick={onReset}>
            {t("reset")}
          </Button>
          <div className="flex flex-wrap gap-1" role="group" aria-label={t("quickRange")}>
            {PRESETS.map((days) => {
              const range = lastDays(days);
              const active = range.from === dateInput.from && range.to === dateInput.to;
              return (
                <Button
                  key={days}
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  aria-pressed={active}
                  onClick={() => onPreset(range)}
                >
                  {t("lastDays", { count: days })}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
