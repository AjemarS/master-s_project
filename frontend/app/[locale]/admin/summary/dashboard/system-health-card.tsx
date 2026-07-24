"use client";

import { CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Badge } from "~/ui/primitives/badge";

interface ServiceHealthItem {
  status: "healthy" | "unhealthy" | "loading";
  label: string;
}

interface SystemHealthCardProps {
  services: Record<string, ServiceHealthItem>;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

const StatusIcon = ({ status }: { status: ServiceHealthItem["status"] }) => {
  if (status === "loading") {
    return <div className="h-5 w-5 rounded-full bg-muted-foreground/20 animate-pulse" />;
  }
  if (status === "healthy") {
    return <CheckCircle className="h-5 w-5 text-primary" />;
  }
  return <XCircle className="h-5 w-5 text-destructive" />;
};

export default function SystemHealthCard({ services, tSum }: SystemHealthCardProps) {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-foreground">
          <BarChart3 className="h-5 w-5" />
          {tSum("systemHealth")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(services).map(([key, svc]) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <StatusIcon status={svc.status} />
                <span className="font-medium text-foreground">{svc.label}</span>
              </div>
              <Badge
                variant={svc.status === "healthy" ? "default" : "destructive"}
              >
                {svc.status === "loading"
                  ? "..."
                  : svc.status === "healthy"
                    ? tSum("healthy")
                    : tSum("unhealthy")}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
