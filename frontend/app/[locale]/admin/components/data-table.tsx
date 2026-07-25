"use client";

import { Fragment } from "react";
import { type LucideIcon, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/ui/primitives/table";
import { TableSkeleton, EmptyState } from ".";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isValidating?: boolean;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
  emptyMessage: string;
  emptyIcon: LucideIcon;
  colSpan?: number;
  rows?: number;
  keyExtractor: (row: T) => string | number;
  expandedId?: string | number | null;
  onToggleExpand?: (id: string | number) => void;
  renderExpandedContent?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  isValidating,
  sortField,
  sortDir,
  onSort,
  emptyMessage,
  emptyIcon,
  colSpan,
  rows = 8,
  keyExtractor,
  expandedId,
  onToggleExpand,
  renderExpandedContent,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={rows} cols={columns.length} />;
  }

  return (
    <div className="border rounded-lg dark:border-border relative">
      {isValidating && (
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>Updating...</span>
            </div>
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 border-b border-border">
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={
                  col.sortable
                    ? `cursor-pointer hover:text-foreground select-none ${col.headerClassName ?? ""}`
                    : col.headerClassName ?? ""
                }
                onClick={col.sortable && onSort ? () => onSort(col.id) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && onSort && (
                    sortField === col.id ? (
                      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <EmptyState icon={emptyIcon} message={emptyMessage} colSpan={colSpan ?? columns.length} />
          ) : (
            data.map((row, index) => {
              const id = keyExtractor(row);
              const isExpanded = expandedId === id;
              return (
                <Fragment key={`${id}-${index}`}>
                  <TableRow
                    className={onToggleExpand ? "cursor-pointer" : undefined}
                    onClick={onToggleExpand ? () => onToggleExpand(id) : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.id} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && renderExpandedContent && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={colSpan ?? columns.length}>
                        {renderExpandedContent(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
