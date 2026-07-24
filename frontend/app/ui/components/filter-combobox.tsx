"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

interface FilterComboboxProps {
  items: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  searchPlaceholder: string;
  emptyText: string;
  allLabel: string;
}

export function FilterCombobox({
  items,
  value,
  onChange,
  searchPlaceholder,
  emptyText,
  allLabel,
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs font-normal"
          role="combobox"
          variant="outline"
        >
          {value || allLabel}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-3 w-3", value === null ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item}
                  onSelect={() => {
                    onChange(item === value ? null : item);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3 w-3", value === item ? "opacity-100" : "opacity-0")} />
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
