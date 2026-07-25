"use client";

import { useTranslations } from "next-intl";
import { Search, ArrowUpDown } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/primitives/select";

interface OrderFiltersProps {
  currentStatus: string;
  currentChannel: string;
  searchTerm: string;
  ordering: string;
  onStatusChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onOrderingChange: (value: string) => void;
}

export function OrderFilters({
  currentStatus,
  currentChannel,
  searchTerm,
  ordering,
  onStatusChange,
  onChannelChange,
  onSearchChange,
  onOrderingChange,
}: OrderFiltersProps) {
  const t = useTranslations("orders");

  const STATUS_TABS = [
    { value: "", label: t("allStatuses") },
    { value: "unpaid", label: t("unpaid") },
    { value: "paid", label: t("paid") },
    { value: "delivering", label: t("delivering") },
    { value: "delivered", label: t("delivered") },
    { value: "completed", label: t("completed") },
    { value: "cancelled", label: t("cancelled") },
  ] as const;

  const CHANNEL_TABS = [
    { value: "", label: t("allChannels") },
    { value: "online", label: t("online") },
    { value: "offline", label: t("offline") },
  ] as const;

  return (
    <>
      {/* Status Filter Tabs */}
      <div className="mb-2 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={currentStatus === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Channel Filter Tabs */}
      <div className="mb-2 flex flex-wrap gap-2">
        {CHANNEL_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={currentChannel === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChannelChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Search + Ordering */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchOrders")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={ordering} onValueChange={onOrderingChange}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-created_at">{t("newest")}</SelectItem>
            <SelectItem value="created_at">{t("oldest")}</SelectItem>
            <SelectItem value="-total_amount">{t("highestAmount")}</SelectItem>
            <SelectItem value="total_amount">{t("lowestAmount")}</SelectItem>
            <SelectItem value="status">{t("byStatus")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
