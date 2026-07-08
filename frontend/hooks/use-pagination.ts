import { useEffect, useMemo, useState } from "react";

import { PAGE_SIZE, getPageCount, paginateItems } from "@/lib/pagination";

export function usePagination<T>(
  items: T[],
  pageSize = PAGE_SIZE,
  resetKey?: string | number,
) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = getPageCount(totalItems, pageSize);

  useEffect(() => {
    setPage(1);
  }, [totalItems, pageSize, resetKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(
    () => paginateItems(items, page, pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
  };
}
