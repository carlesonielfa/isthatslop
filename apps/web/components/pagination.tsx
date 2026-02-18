import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string; // e.g., "/browse/hall-of-shame"
  sort?: string; // current sort value to preserve in links
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  sort,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={buildHref(currentPage - 1)}
            className="text-accent hover:underline"
          >
            Prev
          </Link>
        ) : (
          <span className="text-muted-foreground">Prev</span>
        )}
        <span className="text-muted-foreground">|</span>
        {hasNext ? (
          <Link
            href={buildHref(currentPage + 1)}
            className="text-accent hover:underline"
          >
            Next
          </Link>
        ) : (
          <span className="text-muted-foreground">Next</span>
        )}
      </div>
    </div>
  );
}
