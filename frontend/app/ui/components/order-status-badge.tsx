import { Badge } from "~/ui/primitives/badge";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "~/lib/utils/order-status";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const colorClass = ORDER_STATUS_COLORS[status] || "bg-slate-100 text-slate-800";
  return (
    <Badge className={`text-xs ${colorClass}`}>
      {orderStatusLabel(status)}
    </Badge>
  );
}
