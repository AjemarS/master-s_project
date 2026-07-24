"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import {
  PieChart as RechartPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChannelData {
  channel: string;
  revenue: number;
}

interface ChannelPieChartProps {
  data?: ChannelData[];
  colors: string[];
  onlineLabel: string;
  offlineLabel: string;
  tSum: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function ChannelPieChart({
  data,
  colors,
  onlineLabel,
  offlineLabel,
  tSum,
}: ChannelPieChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-foreground text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          {tSum("channelPie")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <RechartPie>
            <Pie
              data={data.map((ch) => ({
                name: ch.channel === "online" ? onlineLabel : offlineLabel,
                value: ch.revenue,
              }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, percent }) =>
                `${name} ${((percent || 0) * 100).toFixed(0)}%`
              }
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RechartPie>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
