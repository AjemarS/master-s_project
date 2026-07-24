"use client";

import * as React from "react";
import { Slider } from "~/ui/primitives/slider";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
}

export function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  formatValue,
}: PriceRangeSliderProps) {
  const format = formatValue || ((v: number) => `${v.toLocaleString()} ₴`);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(value[0])}</span>
        <span>{format(value[1])}</span>
      </div>
      <Slider
        max={max}
        min={min}
        step={1}
        value={value}
        onValueChange={(vals) => {
          if (vals.length === 2) onChange(vals as [number, number]);
        }}
      />
    </div>
  );
}
