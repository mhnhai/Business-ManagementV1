"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListTableShellProps = {
  children: ReactNode;
  pagination?: ReactNode;
  className?: string;
};

/** Khung danh sách cố định chiều cao tối thiểu, phân trang luôn ở cùng vị trí. */
export function ListTableShell({
  children,
  pagination,
  className,
}: ListTableShellProps) {
  return (
    <div className={cn("flex min-h-[28rem] flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-x-auto">{children}</div>
      {pagination ? (
        <div className="mt-4 shrink-0 border-t border-border/60 pt-4">
          {pagination}
        </div>
      ) : null}
    </div>
  );
}
