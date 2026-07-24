"use client";

import { Skeleton } from "~/ui/primitives/skeleton";
import { Card, CardContent, CardHeader } from "~/ui/primitives/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/ui/primitives/table";

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="border rounded-lg dark:border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 dark:bg-muted border-b dark:border-border">
            {Array.from({ length: cols }).map((_, i) => (
              <TableHead key={i}><Skeleton className="h-4 w-24" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card className="dark:bg-card dark:border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}
