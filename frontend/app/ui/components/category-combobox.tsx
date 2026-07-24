"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "~/ui/primitives/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/ui/primitives/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/ui/primitives/popover";
import { cn } from "~/lib/cn";

interface CategoryComboboxProps {
  categories: { id: number; name: string }[];
  value: number | null;
  onChange: (value: number | null) => void;
}

export function CategoryCombobox({ categories, value, onChange }: CategoryComboboxProps) {
  const t = useTranslations("products");
  const [open, setOpen] = React.useState(false);

  const selectedLabel = value
    ? categories.find((c) => c.id === value)?.name
    : t("allCategories");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedLabel || t("allCategories")}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={t("searchCategory")} />
          <CommandList>
            <CommandEmpty>{t("noResults")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-3 w-3", value === null ? "opacity-100" : "opacity-0")} />
                {t("allCategories")}
              </CommandItem>
              {categories.map((cat) => (
                <CommandItem
                  key={cat.id}
                  onSelect={() => {
                    onChange(cat.id === value ? null : cat.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3 w-3", value === cat.id ? "opacity-100" : "opacity-0")} />
                  {cat.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
