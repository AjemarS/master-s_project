"use client";

import { useMemo, useState } from "react";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "~/ui/primitives/input";
import { Button } from "~/ui/primitives/button";
import { Label } from "~/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "~/ui/primitives/radio-group";
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
import {
  useWarehouses,
  useDeliveryWarehouses,
  useNovaPoshtaWarehouses,
} from "~/lib/hooks/use-api-data";
import { useDebounce } from "~/lib/hooks/use-debounce";

interface WarehouseOption {
  name: string;
  address: string;
  ref?: string;
}

const DELIVERY_OPTIONS = [
  { value: "pickup", labelKey: "pickup" },
  { value: "nova_poshta", labelKey: "novaPoshta" },
  { value: "ukrposhta", labelKey: "ukrposhta" },
  { value: "other_courier", labelKey: "otherDelivery" },
] as const;

const OTHER_DELIVERY_OPTIONS = [
  { value: "meest", labelKey: "deliveryMeest" },
  { value: "justin", labelKey: "deliveryJustin" },
  { value: "courier", labelKey: "deliveryDelivery" },
  { value: "inshe", labelKey: "deliveryInshe" },
] as const;

interface DeliveryMethodProps {
  deliveryType: string;
  onDeliveryTypeChange: (val: string) => void;
  deliveryBranch: string;
  onDeliveryBranchChange: (val: string) => void;
  otherDeliveryService: string;
  onOtherServiceChange: (val: string) => void;
  city: string;
  cityRef: string | null;
  selectedShowroomId: number | null;
  onShowroomSelect: (id: number, label: string) => void;
  onWarehouseSelect: (warehouse: WarehouseOption) => void;
  tChk: (key: string) => string;
}

export function DeliveryMethod({
  deliveryType,
  onDeliveryTypeChange,
  deliveryBranch,
  onDeliveryBranchChange,
  otherDeliveryService,
  onOtherServiceChange,
  city,
  cityRef,
  selectedShowroomId,
  onShowroomSelect,
  onWarehouseSelect,
  tChk,
}: DeliveryMethodProps) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const debouncedBranchQuery = useDebounce(branchQuery, 300);

  const { data: npData, isLoading: npLoading, error: npError } = useNovaPoshtaWarehouses(
    cityRef,
    debouncedBranchQuery,
  );
  const { data: upData, isLoading: upLoading, error: upError } = useDeliveryWarehouses(
    city,
    "ukrposhta",
  );
  const { data: warehousesData, isLoading: showroomsLoading } = useWarehouses();

  const showrooms = useMemo(
    () =>
      (warehousesData?.results ?? []).filter(
        (w) => w.type === "showroom" && w.is_active,
      ),
    [warehousesData],
  );

  const handleTypeChange = (val: string) => {
    setOtherOpen(false);
    setWarehouseOpen(false);
    onDeliveryTypeChange(val);
  };

  const handleNpOpenChange = (open: boolean) => {
    setWarehouseOpen(open);
    if (!open) setBranchQuery("");
  };

  const renderWarehouseContent = (placeholderKey: string) => {
    const ukrposhtaWarehouses = upData?.data ?? [];

    if (upLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tChk("warehouseLoading")}
        </div>
      );
    }

    if (Boolean(upError)) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{tChk("warehouseError")}</p>
          <Input
            value={deliveryBranch}
            onChange={(e) => onDeliveryBranchChange(e.target.value)}
            placeholder={tChk(placeholderKey)}
          />
        </div>
      );
    }

    if (ukrposhtaWarehouses.length > 0) {
      return (
        <Popover open={warehouseOpen} onOpenChange={setWarehouseOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={warehouseOpen}
              className="w-full justify-between font-normal"
            >
              {deliveryBranch || tChk("selectWarehouse")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
            <Command>
              <CommandInput placeholder={tChk("warehousePlaceholder")} />
              <CommandList>
                <CommandEmpty>{tChk("noWarehouses")}</CommandEmpty>
                <CommandGroup>
                  {ukrposhtaWarehouses.map((wh, idx) => (
                    <CommandItem
                      key={wh.ref || idx}
                      value={wh.name || wh.address}
                      onSelect={() => onWarehouseSelect(wh)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          deliveryBranch === (wh.name || wh.address)
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span>{wh.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {wh.address}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Input
        value={deliveryBranch}
        onChange={(e) => onDeliveryBranchChange(e.target.value)}
        placeholder={tChk(placeholderKey)}
      />
    );
  };

  const renderNovaPoshtaContent = () => {
    const trimmedQuery = branchQuery.trim();

    return (
      <Popover open={warehouseOpen} onOpenChange={handleNpOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={warehouseOpen}
            className="w-full justify-between font-normal"
          >
            {deliveryBranch || tChk("selectWarehouse")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput
              value={branchQuery}
              onValueChange={setBranchQuery}
              placeholder={tChk("warehousePlaceholder")}
            />
            {npLoading && !npData ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tChk("warehouseLoading")}
              </div>
            ) : npError ? (
              <p className="p-4 text-sm text-destructive">{tChk("warehouseError")}</p>
            ) : (
              <CommandList>
                <CommandEmpty>
                  {npData?.error ? (
                    <span className="text-sm text-muted-foreground">
                      {tChk("searchError")}
                    </span>
                  ) : trimmedQuery.length > 0 && trimmedQuery.length < 3 ? (
                    <span className="text-sm text-muted-foreground">
                      {tChk("typeToSearch")}
                    </span>
                  ) : (
                    tChk("noWarehouses")
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {(npData?.warehouses ?? []).map((wh) => (
                    <CommandItem
                      key={wh.ref}
                      value={`${wh.name} ${wh.address}`}
                      onSelect={() => {
                        onWarehouseSelect({
                          name: wh.name,
                          ref: wh.ref,
                          address: wh.address,
                        });
                        setBranchQuery("");
                        setWarehouseOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          deliveryBranch === wh.name ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          <span>{wh.name}</span>
                          {wh.type === "postomat" && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                              {tChk("postomat")}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {wh.address}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderShowroomContent = () => {
    if (showroomsLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tChk("warehouseLoading")}
        </div>
      );
    }

    if (showrooms.length === 0) {
      return <p className="text-sm text-muted-foreground">{tChk("noShowrooms")}</p>;
    }

    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {tChk("selectShowroom")}
        </p>
        <RadioGroup
          value={selectedShowroomId === null ? "" : String(selectedShowroomId)}
          onValueChange={(value) => {
            const showroom = showrooms.find((s) => String(s.id) === value);
            if (showroom) {
              onShowroomSelect(showroom.id, `${showroom.name}, ${showroom.address}`);
            }
          }}
          className="space-y-2"
        >
          {showrooms.map((showroom) => {
            const selected = selectedShowroomId === showroom.id;
            return (
              <Label
                key={showroom.id}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <RadioGroupItem value={String(showroom.id)} />
                <div className="flex flex-col">
                  <span className="font-medium">{showroom.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {showroom.address}
                  </span>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </div>
    );
  };

  const selectedOther = OTHER_DELIVERY_OPTIONS.find(
    (opt) => opt.value === otherDeliveryService
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Delivery options */}
      <RadioGroup
        value={deliveryType}
        onValueChange={handleTypeChange}
        className="space-y-2"
      >
        {DELIVERY_OPTIONS.map((opt) => {
          const selected = deliveryType === opt.value;
          return (
            <Label
              key={opt.value}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <RadioGroupItem value={opt.value} />
              <span className="font-medium">{tChk(opt.labelKey)}</span>
            </Label>
          );
        })}
      </RadioGroup>

      {/* Additional info for the selected method */}
      <div className="rounded-lg border p-4 min-w-0">
        {deliveryType === "pickup" && renderShowroomContent()}
        {deliveryType === "nova_poshta" && renderNovaPoshtaContent()}
        {deliveryType === "ukrposhta" && renderWarehouseContent("ukrposhtaPlaceholder")}
        {deliveryType === "other_courier" && (
          <Popover open={otherOpen} onOpenChange={setOtherOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={otherOpen}
                className="w-full justify-between font-normal"
              >
                {selectedOther
                  ? tChk(selectedOther.labelKey)
                  : tChk("otherDeliverySelect")}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {OTHER_DELIVERY_OPTIONS.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => {
                          onOtherServiceChange(opt.value);
                          setOtherOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            otherDeliveryService === opt.value
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        {tChk(opt.labelKey)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
