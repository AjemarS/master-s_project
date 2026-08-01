"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
import { useNovaPoshtaCities } from "~/lib/hooks/use-api-data";
import { useDebounce } from "~/lib/hooks/use-debounce";

interface CitySelectorProps {
  city: string;
  cityOpen: boolean;
  onCityOpenChange: (open: boolean) => void;
  onCitySelect: (name: string, ref: string) => void;
  tChk: (key: string) => string;
  tCommon: (key: string) => string;
}

const CITY_TYPE_MISTO = "місто";

export function CitySelector({
  city,
  cityOpen,
  onCityOpenChange,
  onCitySelect,
  tChk,
  tCommon,
}: CitySelectorProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading, error } = useNovaPoshtaCities(debouncedQuery);
  const cities = data?.cities ?? [];
  const canSearch = debouncedQuery.trim().length >= 3;
  const hasSearchError = Boolean(data?.error) || Boolean(error);

  const handleOpenChange = (open: boolean) => {
    if (!open) setQuery("");
    onCityOpenChange(open);
  };

  return (
    <>
      <Label htmlFor="co-city">{tChk("selectCity")}</Label>
      <Popover open={cityOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="co-city"
            variant="outline"
            role="combobox"
            aria-expanded={cityOpen}
            className="mt-4 w-full justify-between font-normal"
          >
            {city || tChk("selectCity")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={tChk("selectCity")}
            />
            <CommandList className="max-h-72 overflow-auto">
              {isLoading && canSearch ? (
                <CommandItem disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {tCommon("loading")}
                  </span>
                </CommandItem>
              ) : (
                <>
                  <CommandEmpty>
                    {canSearch && hasSearchError ? (
                      <span className="text-sm text-muted-foreground">
                        {tChk("searchError")}
                      </span>
                    ) : canSearch ? (
                      tCommon("noResults")
                    ) : (
                      tChk("typeToSearch")
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {cities.map((cityItem) => (
                      <CommandItem
                        key={cityItem.ref}
                        value={cityItem.name}
                        className="w-full"
                        onSelect={() => {
                          onCitySelect(cityItem.name, cityItem.ref);
                          setQuery("");
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            city === cityItem.name ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {cityItem.name}
                        </span>
                        {cityItem.type && cityItem.type !== CITY_TYPE_MISTO && (
                          <span className="ml-1 text-sm text-muted-foreground shrink-0">
                            ({cityItem.type})
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
