import { Badge } from "~/ui/primitives/badge";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "~/lib/utils/order-status";

interface OrderStatusBadgeProps {
  status: string;
  t?: (key: string) => string;
}

export function OrderStatusBadge({ status, t }: OrderStatusBadgeProps) {
  const colorClass = ORDER_STATUS_COLORS[status] || "bg-slate-100 text-slate-800";
  return (
    <Badge className={`text-xs ${colorClass}`}>
      {t ? orderStatusLabel(t, status) : status}
    </Badge>
  );
}
