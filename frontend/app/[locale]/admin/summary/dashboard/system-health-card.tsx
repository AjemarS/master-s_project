"use client";

import { useEffect, useState } from "react";
import { BarChart3, Package, Warehouse, ShoppingCart, Shield, Monitor, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";

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
  const [services, setServices] = useState<Record<string, ServiceHealth>>(INITIAL_SERVICES);

  useEffect(() => {
    const abort = new AbortController();
    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost/api"
    ).replace(/\/api$/, "");

    const checkHealth = async () => {
      try {
        const res = await fetch(`${baseUrl}/health`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error("Health check failed");
        const data = await res.json();
        const svcs = data.services || {};
        setServices({
          product: {
            status: svcs.product?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Products",
          },
          inventory: {
            status: svcs.inventory?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Inventory",
          },
          order: {
            status: svcs.order?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Orders",
          },
          auth: {
            status: svcs.auth?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Auth",
          },
          frontend: {
            status: svcs.frontend?.status === "healthy" ? "healthy" : "unhealthy",
            label: "Frontend",
          },
          rabbitmq: {
            status: svcs.rabbitmq?.status === "healthy" ? "healthy" : "unhealthy",
            label: "RabbitMQ",
          },
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setServices({
          product: { status: "unhealthy", label: "Products" },
          inventory: { status: "unhealthy", label: "Inventory" },
          order: { status: "unhealthy", label: "Orders" },
          auth: { status: "unhealthy", label: "Auth" },
          frontend: { status: "unhealthy", label: "Frontend" },
          rabbitmq: { status: "unhealthy", label: "RabbitMQ" },
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      clearInterval(interval);
      abort.abort();
    };
  }, []);

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
