"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "~/ui/primitives/card";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Calendar } from "lucide-react";

interface ReportDateFilterProps {
  dateInput: { from: string; to: string };
  dateRangeError: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function ReportDateFilter({
  dateInput,
  dateRangeError,
  onDateChange,
  onApply,
  onReset,
}: ReportDateFilterProps) {
  const t = useTranslations("reports");

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">{t("dateFrom")}</Label>
            <Input
              type="date"
              value={dateInput.from}
              onChange={(e) => onDateChange("from", e.target.value)}
              className={`w-40 ${dateRangeError ? "border-red-500" : ""}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t("dateTo")}</Label>
            <Input
              type="date"
              value={dateInput.to}
              onChange={(e) => onDateChange("to", e.target.value)}
              className={`w-40 ${dateRangeError ? "border-red-500" : ""}`}
            />
          </div>
          <Button size="sm" onClick={onApply}>
            {t("update")}
          </Button>
          {(dateInput.from || dateInput.to) && (
            <Button size="sm" variant="outline" onClick={onReset}>
              {t("reset")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
