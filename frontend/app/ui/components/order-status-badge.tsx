import { useTranslations } from "next-intl";
import { Badge } from "~/ui/primitives/badge";
import { ORDER_STATUS_COLORS, orderStatusLabel } from "~/lib/utils/order-status";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("orders");
  const colorClass = ORDER_STATUS_COLORS[status] || "bg-muted text-muted-foreground";
  return (
    <Badge className={`text-xs ${colorClass}`}>
      {orderStatusLabel(t, status)}
    </Badge>
  );
}
