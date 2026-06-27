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
    <div className="border rounded-lg dark:border-slate-700 relative">
      {isValidating && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-200 dark:bg-purple-900 overflow-hidden rounded-t-lg">
          <div className="h-full w-1/3 bg-purple-600 animate-pulse rounded-full" />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={
                  col.sortable
                    ? `cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none ${col.headerClassName ?? ""}`
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
            data.map((row) => {
              const id = keyExtractor(row);
              const isExpanded = expandedId === id;
              return (
                <Fragment key={id}>
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
