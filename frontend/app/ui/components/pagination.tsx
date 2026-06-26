import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/ui/primitives/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalCount, loading, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t pt-4 mt-4">
      <div className="text-sm text-slate-500">
        {totalCount} запис{totalCount === 1 ? "ь" : "ів"}
        {loading && "..."}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPageNumbers(currentPage, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400">...</span>
          ) : (
            <Button
              key={p}
              variant={currentPage === p ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(p as number)}
              disabled={loading}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  if (total > 1) pages.push(total);

  return pages;
}
