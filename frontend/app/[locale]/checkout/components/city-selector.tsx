"use client";

import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { Label } from "~/ui/primitives/label";
import { Button } from "~/ui/primitives/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/ui/primitives/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/ui/primitives/command";
import { UKRAINIAN_CITIES } from "~/lib/constants/cities";

interface CitySelectorProps {
  city: string;
  cityOpen: boolean;
  onCityOpenChange: (open: boolean) => void;
  onCitySelect: (city: string) => void;
  tChk: (key: string) => string;
  tCommon: (key: string) => string;
}

export function CitySelector({
  city,
  cityOpen,
  onCityOpenChange,
  onCitySelect,
  tChk,
  tCommon,
}: CitySelectorProps) {
  return (
    <div>
      <Label htmlFor="co-city">{tChk("selectCity")}</Label>
      <Popover open={cityOpen} onOpenChange={onCityOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="co-city"
            variant="outline"
            role="combobox"
            aria-expanded={cityOpen}
            className="mt-1.5 w-full max-w-md justify-between font-normal"
          >
            {city || tChk("selectCity")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={tChk("selectCity")} />
            <CommandList>
              <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
              <CommandGroup>
                {UKRAINIAN_CITIES.map((c) => (
                  <CommandItem
                    key={c}
                    value={c}
                    onSelect={() => onCitySelect(c)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        city === c ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {c}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
