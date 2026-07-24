"use client";

import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Label } from "~/ui/primitives/label";
import { Input } from "~/ui/primitives/input";
import { Button } from "~/ui/primitives/button";
import { RadioGroup, RadioGroupItem } from "~/ui/primitives/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/primitives/select";
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

interface WarehouseOption {
  name: string;
  address: string;
  ref?: string;
}

interface WarehouseFetchState {
  warehouses: WarehouseOption[];
  loading: boolean;
  error: boolean;
}

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
  warehouseFetch: WarehouseFetchState;
  warehouseOpen: boolean;
  onWarehouseOpenChange: (open: boolean) => void;
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
  warehouseFetch,
  warehouseOpen,
  onWarehouseOpenChange,
  onWarehouseSelect,
  tChk,
}: DeliveryMethodProps) {
  const renderWarehouseContent = (placeholderKey: string) => {
    if (warehouseFetch.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tChk("warehouseLoading")}
        </div>
      );
    }

    if (warehouseFetch.error) {
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

    if (warehouseFetch.warehouses.length > 0) {
      return (
        <Popover open={warehouseOpen} onOpenChange={onWarehouseOpenChange}>
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
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder={tChk("warehousePlaceholder")} />
              <CommandList>
                <CommandEmpty>{tChk("noWarehouses")}</CommandEmpty>
                <CommandGroup>
                  {warehouseFetch.warehouses.map((wh, idx) => (
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

  return (
    <RadioGroup
      value={deliveryType}
      onValueChange={onDeliveryTypeChange}
      className="space-y-3"
    >
      {/* Pickup */}
      <Label
        className={`flex flex-col border rounded-lg p-4 cursor-pointer transition-colors ${
          deliveryType === "pickup"
            ? "border-primary bg-primary/5"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="pickup" />
          <span className="font-medium">{tChk("pickup")}</span>
        </div>
        {deliveryType === "pickup" && (
          <p className="mt-2 text-sm text-muted-foreground pl-6">
            {tChk("pickupAddress")}
          </p>
        )}
      </Label>

      {/* Nova Poshta */}
      <Label
        className={`flex flex-col border rounded-lg p-4 cursor-pointer transition-colors ${
          deliveryType === "nova_poshta"
            ? "border-primary bg-primary/5"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="nova_poshta" />
          <span className="font-medium">{tChk("novaPoshta")}</span>
        </div>
        {deliveryType === "nova_poshta" && (
          <div
            className="mt-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            {renderWarehouseContent("novaPoshtaPlaceholder")}
          </div>
        )}
      </Label>

      {/* Ukrposhta */}
      <Label
        className={`flex flex-col border rounded-lg p-4 cursor-pointer transition-colors ${
          deliveryType === "ukrposhta"
            ? "border-primary bg-primary/5"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="ukrposhta" />
          <span className="font-medium">{tChk("ukrposhta")}</span>
        </div>
        {deliveryType === "ukrposhta" && (
          <div
            className="mt-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            {renderWarehouseContent("ukrposhtaPlaceholder")}
          </div>
        )}
      </Label>

      {/* Other delivery service */}
      <Label
        className={`flex flex-col border rounded-lg p-4 cursor-pointer transition-colors ${
          deliveryType === "other_courier"
            ? "border-primary bg-primary/5"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="other_courier" />
          <span className="font-medium">{tChk("otherDelivery")}</span>
        </div>
        {deliveryType === "other_courier" && (
          <div
            className="mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={otherDeliveryService}
              onValueChange={onOtherServiceChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tChk("otherDeliverySelect")} />
              </SelectTrigger>
              <SelectContent>
                {OTHER_DELIVERY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {tChk(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Label>
    </RadioGroup>
  );
}
