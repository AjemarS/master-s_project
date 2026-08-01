"use client";

import { useMemo } from "react";
import { BarChart3, Package, Warehouse, ShoppingCart, Shield, Monitor, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";
import { useSystemHealth } from "~/lib/hooks/use-api-data";

interface SystemHealthCardProps {
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

interface ServiceHealth {
  status: "healthy" | "unhealthy" | "loading";
  label: string;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  product: <Package className="h-4 w-4" />,
  inventory: <Warehouse className="h-4 w-4" />,
  order: <ShoppingCart className="h-4 w-4" />,
  auth: <Shield className="h-4 w-4" />,
  frontend: <Monitor className="h-4 w-4" />,
  rabbitmq: <Activity className="h-4 w-4" />,
};

const INITIAL_SERVICES: Record<string, ServiceHealth> = {
  product: { status: "loading", label: "Products" },
  inventory: { status: "loading", label: "Inventory" },
  order: { status: "loading", label: "Orders" },
  auth: { status: "loading", label: "Auth" },
  frontend: { status: "loading", label: "Frontend" },
  rabbitmq: { status: "loading", label: "RabbitMQ" },
};

const StatusDot = ({ status }: { status: ServiceHealth["status"] }) => {
  if (status === "loading") {
    return <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20 animate-pulse" />;
  }
  return (
    <div
      className={`h-2.5 w-2.5 rounded-full ${
        status === "healthy" ? "bg-green-500" : "bg-destructive"
      }`}
    />
  );
};

export default function SystemHealthCard({ tSum }: SystemHealthCardProps) {
  const { data: healthData, error: healthError } = useSystemHealth();

  const services = useMemo<Record<string, ServiceHealth>>(() => {
    if (healthError) {
      return Object.fromEntries(
        Object.entries(INITIAL_SERVICES).map(([key, svc]) => [key, { ...svc, status: "unhealthy" }]),
      ) as Record<string, ServiceHealth>;
    }
    if (!healthData) return INITIAL_SERVICES;
    return Object.fromEntries(
      Object.entries(healthData.services).map(([serviceName, entry]) => [
        serviceName,
        {
          status: entry.status === "healthy" ? "healthy" : "unhealthy",
          label: entry.label ?? INITIAL_SERVICES[serviceName]?.label ?? serviceName,
        },
      ]),
    ) as Record<string, ServiceHealth>;
  }, [healthData, healthError]);

  const entries = Object.entries(services);
  const allHealthy = entries.every(([, svc]) => svc.status === "healthy");

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-foreground">
            <BarChart3 className="h-5 w-5" />
            {tSum("systemHealth")}
          </CardTitle>
          {!entries.some(([, s]) => s.status === "loading") && (
            <Badge variant={allHealthy ? "default" : "destructive"} className="text-xs">
              {allHealthy
                ? tSum("healthy")
                : `${entries.filter(([, s]) => s.status === "unhealthy").length} ${tSum("unhealthy").toLowerCase()}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(([key, svc]) => (
            <div
              key={key}
              className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-lg"
            >
              <span className="text-muted-foreground shrink-0">
                {SERVICE_ICONS[key] || <BarChart3 className="h-4 w-4" />}
              </span>
              <span className="font-medium text-sm text-foreground flex-1 min-w-0 truncate">
                {svc.label}
              </span>
              <StatusDot status={svc.status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
